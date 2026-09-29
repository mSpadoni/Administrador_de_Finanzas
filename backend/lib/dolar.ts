import "server-only";
import { z } from "zod";
import { TIPOS_DE_DOLAR, type TipoDeDolar } from "@/backend/models/dominio/movimiento";
// Cliente de dolarapi.com: las cotizaciones del dólar en Argentina. Es la API externa del asistente. No necesita
// API key. Un solo pedido (/v1/dolares) trae todos los tipos de dólar; se guarda 5 minutos.

/** La cotización de un tipo de dólar, en pesos. `actualizada`: cuándo la publicó la fuente (ISO 8601). */
export type Cotizacion = { tipoDeDolar: TipoDeDolar; compra: number; venta: number; actualizada: string };

/** Por qué no se pudo obtener la cotización. */
export type MotivoError =
  | "tiempo" // dolarapi no respondió a tiempo
  | "limite" // respondió 429: demasiados pedidos
  | "servicio" // falló (5xx) o no se pudo conectar
  | "respuesta_invalida"; // respondió algo que no son las cotizaciones esperadas

type Fallo = { ok: false; motivo: MotivoError; detalle: string };
export type ResultadoCotizaciones = { ok: true; cotizaciones: Cotizacion[] } | Fallo;
export type ResultadoCotizacion = { ok: true; cotizacion: Cotizacion } | Fallo;

/** La configuración del cliente. Todo es opcional: sin nada, usa dolarapi.com con 5 s, 1 reintento y 5 min de caché. */
export type OpcionesDolar = {
  /** Dirección completa del endpoint (por defecto https://dolarapi.com/v1/dolares). */
  endpoint?: string;
  /** Cuánto esperar cada intento (ms). */
  timeoutMs?: number;
  /** Reintentos ante timeout, 5xx o 429. */
  reintentos?: number;
  /** Cuánto se reutilizan las cotizaciones antes de volver a pedirlas (ms). */
  duracionCacheMs?: number;
  /** Máximo que se espera por un Retry-After de un 429 (ms); si piden más, no se reintenta. */
  maxEsperaReintentoMs?: number;
  /** Cuánto esperar antes de reintentar un 429 sin Retry-After (ms). */
  esperaSinRetryAfterMs?: number;
  /** La hora actual en ms (los tests la controlan para probar el caché). */
  reloj?: () => number;
};

/** Cómo llama dolarapi a cada tipo de dólar de la app. */
const CASA_DE: Record<TipoDeDolar, string> = { oficial: "oficial", blue: "blue", mep: "bolsa", tarjeta: "tarjeta" };

/** Lo que responde dolarapi. Se valida todo lo que se usa: una cotización rara no llega al usuario. */
const RespuestaSchema = z.array(
  z.object({
    casa: z.string(),
    compra: z.number().positive(),
    venta: z.number().positive(),
    fechaActualizacion: z.string(),
  })
);

const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/**
 * Cliente de dolarapi.com: se configura una vez y lo comparten todas las consultas, que así comparten el caché.
 * Nunca lanza: devuelve el resultado o por qué falló, para que el asistente se lo explique a la persona.
 */
export class ClienteDolar {
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly reintentos: number;
  private readonly duracionCacheMs: number;
  private readonly maxEsperaReintentoMs: number;
  private readonly esperaSinRetryAfterMs: number;
  private readonly reloj: () => number;
  /** El último pedido (en curso o terminado bien) y cuándo empezó. Los errores no se guardan. */
  private cache: { desde: number; resultado: Promise<ResultadoCotizaciones> } | null = null;

  constructor({
    endpoint = "https://dolarapi.com/v1/dolares",
    timeoutMs = 5000,
    reintentos = 1,
    duracionCacheMs = 5 * 60_000,
    maxEsperaReintentoMs = 3000,
    esperaSinRetryAfterMs = 1000,
    reloj = Date.now,
  }: OpcionesDolar = {}) {
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
    this.reintentos = reintentos;
    this.duracionCacheMs = duracionCacheMs;
    this.maxEsperaReintentoMs = maxEsperaReintentoMs;
    this.esperaSinRetryAfterMs = esperaSinRetryAfterMs;
    this.reloj = reloj;
  }

  /** Las cotizaciones de todos los tipos de dólar (oficial, blue, MEP y tarjeta). */
  cotizaciones(): Promise<ResultadoCotizaciones> {
    const ahora = this.reloj();
    if (this.cache && ahora - this.cache.desde <= this.duracionCacheMs) return this.cache.resultado;

    const resultado = this.pedir();
    const entrada = { desde: ahora, resultado };
    this.cache = entrada;
    // Si falló, se olvida (salvo que ya lo haya reemplazado otro pedido): la próxima consulta vuelve a intentar.
    void resultado.then((r) => {
      if (!r.ok && this.cache === entrada) this.cache = null;
    });
    return resultado;
  }

  /** La cotización de un tipo de dólar. */
  async cotizacion(tipoDeDolar: TipoDeDolar): Promise<ResultadoCotizacion> {
    const resultado = await this.cotizaciones();
    if (!resultado.ok) return resultado;
    // cotizaciones() garantiza que están todos los tipos.
    const cotizacion = resultado.cotizaciones.find((c) => c.tipoDeDolar === tipoDeDolar)!;
    return { ok: true, cotizacion };
  }

  /** Pide las cotizaciones con timeout y reintentos, y valida la respuesta. */
  private async pedir(): Promise<ResultadoCotizaciones> {
    const { endpoint, timeoutMs, reintentos, maxEsperaReintentoMs, esperaSinRetryAfterMs } = this;

    let ultimoError: Fallo = { ok: false, motivo: "servicio", detalle: "El servicio de cotizaciones no respondió." };
    for (let intento = 0; intento <= reintentos; intento++) {
      let respuesta: Response;
      try {
        respuesta = await fetch(endpoint, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        // AbortSignal.timeout corta con un error de nombre "TimeoutError"; cualquier otro es de conexión.
        const porTiempo = error instanceof Error && error.name === "TimeoutError";
        ultimoError = porTiempo
          ? {
              ok: false,
              motivo: "tiempo",
              detalle: `El servicio de cotizaciones no respondió en ${timeoutMs / 1000} s.`,
            }
          : { ok: false, motivo: "servicio", detalle: "No se pudo conectar con el servicio de cotizaciones." };
        continue;
      }

      // 429: demasiados pedidos. Si Retry-After pide una espera corta, se espera y se reintenta.
      if (respuesta.status === 429) {
        const segundos = Number(respuesta.headers.get("retry-after"));
        ultimoError = {
          ok: false,
          motivo: "limite",
          detalle: "El servicio de cotizaciones recibe demasiados pedidos.",
        };
        const esperaMs = Number.isFinite(segundos) && segundos > 0 ? segundos * 1000 : esperaSinRetryAfterMs;
        if (esperaMs > maxEsperaReintentoMs) break;
        if (intento < reintentos) await esperar(esperaMs);
        continue;
      }

      // 5xx: caído o saturado. Se reintenta.
      if (respuesta.status >= 500) {
        ultimoError = {
          ok: false,
          motivo: "servicio",
          detalle: `El servicio de cotizaciones falló (HTTP ${respuesta.status}).`,
        };
        continue;
      }

      if (!respuesta.ok) {
        return { ok: false, motivo: "respuesta_invalida", detalle: `El servicio respondió HTTP ${respuesta.status}.` };
      }
      return aCotizaciones(await respuesta.text());
    }
    return ultimoError;
  }
}

/** Valida el cuerpo de un 200 y lo pasa a las cotizaciones de la app. Tienen que estar todos los tipos de dólar. */
function aCotizaciones(cuerpo: string): ResultadoCotizaciones {
  const invalida: Fallo = {
    ok: false,
    motivo: "respuesta_invalida",
    detalle: "El servicio de cotizaciones respondió algo inesperado.",
  };
  let json: unknown;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    return invalida;
  }
  const casas = RespuestaSchema.safeParse(json);
  if (!casas.success) return invalida;

  const cotizaciones: Cotizacion[] = [];
  for (const tipoDeDolar of TIPOS_DE_DOLAR) {
    const casa = casas.data.find((c) => c.casa === CASA_DE[tipoDeDolar]);
    if (!casa) return { ...invalida, detalle: `Falta la cotización del dólar ${tipoDeDolar}.` };
    cotizaciones.push({ tipoDeDolar, compra: casa.compra, venta: casa.venta, actualizada: casa.fechaActualizacion });
  }
  return { ok: true, cotizaciones };
}

/** El cliente que usa la app (dolarapi.com, 5 s, 1 reintento, 5 min de caché). */
export const clienteDolar = new ClienteDolar();

import "server-only";
import { TIPOS_DE_DOLAR, type TipoDeDolar } from "@/backend/models/dominio/movimiento";
import {
  falloDeConexion,
  falloDelServicio,
  falloPorCuerpoInvalido,
  falloPorLimite,
  falloPorRespuestaInesperada,
  falloPorTiempo,
  falloSinRespuesta,
  type Fallo,
} from "./erroresLib";
import { validarRespuestaDeDolarapi } from "./validacionLib";

// Cliente de dolarapi.com: las cotizaciones del dólar en Argentina. Es la API externa del asistente. No necesita
// API key. Un solo pedido (/v1/dolares) trae todos los tipos de dólar; se guarda 5 minutos.
// Lo que responde se valida en validacionLib.ts y las fallas se arman en erroresLib.ts.

/** Cómo llama dolarapi a cada tipo de dólar de la app. */
const CASA_DE: Record<TipoDeDolar, string> = { oficial: "oficial", blue: "blue", mep: "bolsa", tarjeta: "tarjeta" };

const ENDPOINT_POR_DEFECTO = "https://dolarapi.com/v1/dolares";

/** La cotización de un tipo de dólar, en pesos. `actualizada`: cuándo la publicó la fuente (ISO 8601). */
export type Cotizacion = { tipoDeDolar: TipoDeDolar; compra: number; venta: number; actualizada: string };

export type ResultadoCotizaciones = { ok: true; cotizaciones: Cotizacion[] } | Fallo;
export type ResultadoCotizacion = { ok: true; cotizacion: Cotizacion } | Fallo;

/**
 * Cómo se configura el cliente del dólar (el objeto que recibe el constructor de ClienteDolar). Todo es opcional:
 * sin nada, usa dolarapi.com con 5 s, 1 reintento y 5 min de caché. Los tests cambian estos valores para probar
 * cada respuesta posible contra un servidor local.
 */
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
    endpoint = ENDPOINT_POR_DEFECTO,
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
    let ultimoError: Fallo = falloSinRespuesta();
    for (let intento = 0; intento <= this.reintentos; intento++) {
      const respuesta = await this.pedirUnaVez();
      if (!(respuesta instanceof Response)) {
        // No se pudo ni conectar (o se venció el tiempo): se reintenta.
        ultimoError = respuesta;
        continue;
      }
      // 429: demasiados pedidos. Si Retry-After pide una espera corta, se espera y se reintenta.
      if (respuesta.status === 429) {
        ultimoError = falloPorLimite();
        const esperaMs = this.esperaDeUn429(respuesta);
        if (esperaMs > this.maxEsperaReintentoMs) break;
        if (intento < this.reintentos) await esperar(esperaMs);
        continue;
      }
      // 5xx: caído o saturado. Se reintenta.
      if (respuesta.status >= 500) {
        ultimoError = falloDelServicio(respuesta.status);
        continue;
      }
      if (!respuesta.ok) return falloPorRespuestaInesperada(respuesta.status);
      return aCotizaciones(await respuesta.text());
    }
    return ultimoError;
  }

  /** Un intento de pedido: la respuesta del servicio, o el fallo si no se pudo conectar o se venció el tiempo. */
  private async pedirUnaVez(): Promise<Response | Fallo> {
    try {
      return await fetch(this.endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      // AbortSignal.timeout corta con un error de nombre "TimeoutError"; cualquier otro es de conexión.
      return error instanceof Error && error.name === "TimeoutError"
        ? falloPorTiempo(this.timeoutMs)
        : falloDeConexion();
    }
  }

  /** Cuánto esperar antes de reintentar un 429: lo que pide Retry-After (en segundos) o una espera por defecto. */
  private esperaDeUn429(respuesta: Response): number {
    const segundos = Number(respuesta.headers.get("retry-after"));
    return Number.isFinite(segundos) && segundos > 0 ? segundos * 1000 : this.esperaSinRetryAfterMs;
  }
}

/** Valida el cuerpo de un 200 y lo pasa a las cotizaciones de la app. Tienen que estar todos los tipos de dólar. */
function aCotizaciones(cuerpo: string): ResultadoCotizaciones {
  let json: unknown;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    return falloPorCuerpoInvalido();
  }
  const casas = validarRespuestaDeDolarapi(json);
  if (!casas) return falloPorCuerpoInvalido();

  const cotizaciones: Cotizacion[] = [];
  for (const tipoDeDolar of TIPOS_DE_DOLAR) {
    const casa = casas.find((c) => c.casa === CASA_DE[tipoDeDolar]);
    if (!casa) return falloPorCuerpoInvalido(`Falta la cotización del dólar ${tipoDeDolar}.`);
    cotizaciones.push({ tipoDeDolar, compra: casa.compra, venta: casa.venta, actualizada: casa.fechaActualizacion });
  }
  return { ok: true, cotizaciones };
}

/** El cliente que usa la app (dolarapi.com, 5 s, 1 reintento, 5 min de caché). */
export const clienteDolar = new ClienteDolar();

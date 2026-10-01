import "server-only";
import type { TipoDeDolar } from "@/backend/models/dominio/movimiento";
import { envDolar } from "../env";
import { CacheDeCotizaciones } from "./cacheDeCotizaciones";
import { aCotizaciones, type ResultadoCotizacion, type ResultadoCotizaciones } from "./cotizaciones";
import {
  falloDeConexion,
  falloDelServicio,
  falloPorCuerpoInvalido,
  falloPorLimite,
  falloPorRespuestaInesperada,
  falloPorTiempo,
  falloSinRespuesta,
  type FalloDelDolar,
} from "./erroresDolar";

// Cliente de dolarapi.com: las cotizaciones del dólar en Argentina. Es la API externa del asistente. No necesita
// API key. Un solo pedido (/v1/dolares) trae todos los tipos de dólar; se guarda 5 minutos (cacheDeCotizaciones.ts).
// Lo que responde se valida en validacionDolar.ts y las fallas se arman en erroresDolar.ts.

/**
 * Cómo se configura el cliente del dólar (el objeto que recibe el constructor de ClienteDolar). Todo es opcional:
 * sin nada, usa dolarapi.com con 5 s, 1 reintento y 5 min de caché. Los tests cambian estos valores para probar
 * cada respuesta posible contra un servidor local.
 */
export type OpcionesDolar = {
  /** Dirección completa del endpoint (por defecto DOLARAPI_URL o https://dolarapi.com/v1/dolares). */
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

/** Qué hacer con la respuesta de un intento de pedido. */
type Veredicto =
  | { tipo: "listo" }
  | { tipo: "reintentar"; fallo: FalloDelDolar; esperaMs: number }
  | { tipo: "cortar"; fallo: FalloDelDolar };

const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/**
 * Cliente de dolarapi.com: se configura una vez y lo comparten todas las consultas, que así comparten el caché.
 * Nunca lanza: devuelve el resultado o por qué falló, para que el asistente se lo explique a la persona.
 */
export class ClienteDolar {
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly reintentos: number;
  private readonly maxEsperaReintentoMs: number;
  private readonly esperaSinRetryAfterMs: number;
  private readonly cache: CacheDeCotizaciones;

  constructor({
    endpoint = envDolar().endpoint,
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
    this.maxEsperaReintentoMs = maxEsperaReintentoMs;
    this.esperaSinRetryAfterMs = esperaSinRetryAfterMs;
    this.cache = new CacheDeCotizaciones(duracionCacheMs, reloj);
  }

  /** Las cotizaciones de todos los tipos de dólar (oficial, blue, MEP y tarjeta). */
  cotizaciones(): Promise<ResultadoCotizaciones> {
    return this.cache.obtener(() => this.pedir());
  }

  /** La cotización de un tipo de dólar. */
  async cotizacion(tipoDeDolar: TipoDeDolar): Promise<ResultadoCotizacion> {
    const resultado = await this.cotizaciones();
    if (!resultado.ok) return resultado;
    const cotizacion = resultado.cotizaciones.find((c) => c.tipoDeDolar === tipoDeDolar);
    // cotizaciones() garantiza que están todos los tipos; si falta uno, la respuesta no era la esperada.
    return cotizacion
      ? { ok: true, cotizacion }
      : falloPorCuerpoInvalido(`Falta la cotización del dólar ${tipoDeDolar}.`);
  }

  /** Pide las cotizaciones con timeout y reintentos, y valida la respuesta. */
  private async pedir(): Promise<ResultadoCotizaciones> {
    let ultimoError: FalloDelDolar = falloSinRespuesta();
    for (let intento = 0; intento <= this.reintentos; intento++) {
      const respuesta = await this.pedirUnaVez();
      if (!(respuesta instanceof Response)) {
        // No se pudo ni conectar (o se venció el tiempo): se reintenta.
        ultimoError = respuesta;
        continue;
      }
      const veredicto = this.veredictoDe(respuesta);
      if (veredicto.tipo === "listo") return this.leerCuerpo(respuesta);
      ultimoError = veredicto.fallo;
      if (veredicto.tipo === "cortar") break;
      if (intento < this.reintentos && veredicto.esperaMs > 0) await esperar(veredicto.esperaMs);
    }
    return ultimoError;
  }

  /** Qué hacer con la respuesta de un intento: usarla, reintentar (esperando `esperaMs`) o darse por vencido. */
  private veredictoDe(respuesta: Response): Veredicto {
    // 429: demasiados pedidos. Si Retry-After pide una espera corta, se espera y se reintenta.
    if (respuesta.status === 429) {
      const esperaMs = this.esperaDeUn429(respuesta);
      return esperaMs > this.maxEsperaReintentoMs
        ? { tipo: "cortar", fallo: falloPorLimite() }
        : { tipo: "reintentar", fallo: falloPorLimite(), esperaMs };
    }
    // 5xx: caído o saturado. Se reintenta enseguida.
    if (respuesta.status >= 500) return { tipo: "reintentar", fallo: falloDelServicio(respuesta.status), esperaMs: 0 };
    if (!respuesta.ok) return { tipo: "cortar", fallo: falloPorRespuestaInesperada(respuesta.status) };
    return { tipo: "listo" };
  }

  /**
   * Lee y valida el cuerpo de un 200. El tiempo del pedido también corre mientras llega el cuerpo: si el servicio se cuelga
   * a mitad de la respuesta, o se corta la conexión, es un fallo (no un error que se escapa).
   */
  private async leerCuerpo(respuesta: Response): Promise<ResultadoCotizaciones> {
    try {
      return aCotizaciones(await respuesta.text());
    } catch (error) {
      return this.falloDeRed(error);
    }
  }

  /** El fallo que corresponde a un error de red: se venció el tiempo, o no se pudo conectar (o se cortó la conexión). */
  private falloDeRed(error: unknown): FalloDelDolar {
    // AbortSignal.timeout corta con un error de nombre "TimeoutError"; cualquier otro es de conexión.
    return error instanceof Error && error.name === "TimeoutError" ? falloPorTiempo(this.timeoutMs) : falloDeConexion();
  }

  /** Un intento de pedido: la respuesta del servicio, o el fallo si no se pudo conectar o se venció el tiempo. */
  private async pedirUnaVez(): Promise<Response | FalloDelDolar> {
    try {
      return await fetch(this.endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      return this.falloDeRed(error);
    }
  }

  /** Cuánto esperar antes de reintentar un 429: lo que pide Retry-After (en segundos) o una espera por defecto. */
  private esperaDeUn429(respuesta: Response): number {
    const segundos = Number(respuesta.headers.get("retry-after"));
    return Number.isFinite(segundos) && segundos > 0 ? segundos * 1000 : this.esperaSinRetryAfterMs;
  }
}

/** El cliente que usa la app (dolarapi.com, 5 s, 1 reintento, 5 min de caché). */
export const clienteDolar = new ClienteDolar();

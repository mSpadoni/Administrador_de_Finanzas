import "server-only";
import { TIPOS_DE_DOLAR, type TipoDeDolar } from "@/backend/models/dominio/movimiento";
import type { Resultado } from "../erroresLib";
import { falloPorCuerpoInvalido, type FalloDelDolar } from "./erroresDolar";
import { validarRespuestaDeDolarapi, type CasaDeDolarapi } from "./validacionDolar";

// Las cotizaciones de la app y cómo salen de lo que responde dolarapi.com.

/** Cómo llama dolarapi a cada tipo de dólar de la app. */
const CASA_DE: Record<TipoDeDolar, string> = { oficial: "oficial", blue: "blue", mep: "bolsa", tarjeta: "tarjeta" };

/** La cotización de un tipo de dólar, en pesos. `actualizada`: cuándo la publicó la fuente (ISO 8601). */
export type Cotizacion = { tipoDeDolar: TipoDeDolar; compra: number; venta: number; actualizada: string };

export type ResultadoCotizaciones = Resultado<{ cotizaciones: Cotizacion[] }, FalloDelDolar>;
export type ResultadoCotizacion = Resultado<{ cotizacion: Cotizacion }, FalloDelDolar>;

/** Valida el cuerpo de un 200 y lo pasa a las cotizaciones de la app. Tienen que estar todos los tipos de dólar. */
export function aCotizaciones(cuerpo: string): ResultadoCotizaciones {
  const casas = validarRespuestaDeDolarapi(leerJson(cuerpo));
  return casas ? cotizacionesDeLasCasas(casas) : falloPorCuerpoInvalido();
}

/** El JSON del texto, o `undefined` si no es un JSON (la validación que sigue lo rechaza igual). */
function leerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

/** Las cotizaciones de la app a partir de las casas de dolarapi; falla si falta alguno de los tipos de dólar. */
function cotizacionesDeLasCasas(casas: CasaDeDolarapi[]): ResultadoCotizaciones {
  const cotizaciones: Cotizacion[] = [];
  for (const tipoDeDolar of TIPOS_DE_DOLAR) {
    const casa = casas.find((c) => c.casa === CASA_DE[tipoDeDolar]);
    if (!casa) return falloPorCuerpoInvalido(`Falta la cotización del dólar ${tipoDeDolar}.`);
    cotizaciones.push({ tipoDeDolar, compra: casa.compra, venta: casa.venta, actualizada: casa.fechaActualizacion });
  }
  return { ok: true, cotizaciones };
}

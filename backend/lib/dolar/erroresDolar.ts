import "server-only";
import { fallo, type Fallo } from "../erroresLib";

// Las fallas de dolarapi.com: no se lanzan. El cliente del dólar devuelve `{ ok: false, motivo, detalle }` para que el
// asistente se las explique a la persona.

/** Por qué no se pudo obtener la cotización. */
export type MotivoDelDolar =
  | "tiempo" // dolarapi no respondió a tiempo
  | "limite" // respondió 429: demasiados pedidos
  | "servicio" // falló (5xx) o no se pudo conectar
  | "respuesta_invalida"; // respondió algo que no son las cotizaciones esperadas

/** Una falla al pedir las cotizaciones. */
export type FalloDelDolar = Fallo<MotivoDelDolar>;

export const falloSinRespuesta = () => fallo<MotivoDelDolar>("servicio", "El servicio de cotizaciones no respondió.");

export const falloPorTiempo = (timeoutMs: number) =>
  fallo<MotivoDelDolar>("tiempo", `El servicio de cotizaciones no respondió en ${timeoutMs / 1000} s.`);

export const falloDeConexion = () =>
  fallo<MotivoDelDolar>("servicio", "No se pudo conectar con el servicio de cotizaciones.");

export const falloPorLimite = () =>
  fallo<MotivoDelDolar>("limite", "El servicio de cotizaciones recibe demasiados pedidos.");

export const falloDelServicio = (status: number) =>
  fallo<MotivoDelDolar>("servicio", `El servicio de cotizaciones falló (HTTP ${status}).`);

export const falloPorRespuestaInesperada = (status: number) =>
  fallo<MotivoDelDolar>("respuesta_invalida", `El servicio respondió HTTP ${status}.`);

export const falloPorCuerpoInvalido = (detalle = "El servicio de cotizaciones respondió algo inesperado.") =>
  fallo<MotivoDelDolar>("respuesta_invalida", detalle);

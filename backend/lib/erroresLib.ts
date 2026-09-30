// Los errores de backend/lib: las variables de entorno mal configuradas (se lanzan) y las fallas de dolarapi.com
// (no se lanzan: el cliente del dólar devuelve `{ ok: false, motivo, detalle }` para que el asistente se las explique
// a la persona). No lleva `server-only` porque env.ts también lo usa el middleware (Edge).

/** Falta una variable de entorno o tiene un valor inválido. El mensaje dice cuál y dónde verlo. */
export class ErrorDeConfiguracion extends Error {
  override name = "ErrorDeConfiguracion";
}

/** Corta con un solo error que junta todos los problemas de la configuración de un servicio. */
export function lanzarConfiguracionIncompleta(servicio: string, problemas: string): never {
  throw new ErrorDeConfiguracion(`Configuración de ${servicio} incompleta: ${problemas} (ver .env.example).`);
}

/** Por qué no se pudo obtener la cotización. */
export type MotivoError =
  | "tiempo" // dolarapi no respondió a tiempo
  | "limite" // respondió 429: demasiados pedidos
  | "servicio" // falló (5xx) o no se pudo conectar
  | "respuesta_invalida"; // respondió algo que no son las cotizaciones esperadas

/** Una falla al pedir las cotizaciones: el motivo (para el código) y el detalle (para explicárselo a la persona). */
export type Fallo = { ok: false; motivo: MotivoError; detalle: string };

export const falloSinRespuesta = (): Fallo => ({
  ok: false,
  motivo: "servicio",
  detalle: "El servicio de cotizaciones no respondió.",
});

export const falloPorTiempo = (timeoutMs: number): Fallo => ({
  ok: false,
  motivo: "tiempo",
  detalle: `El servicio de cotizaciones no respondió en ${timeoutMs / 1000} s.`,
});

export const falloDeConexion = (): Fallo => ({
  ok: false,
  motivo: "servicio",
  detalle: "No se pudo conectar con el servicio de cotizaciones.",
});

export const falloPorLimite = (): Fallo => ({
  ok: false,
  motivo: "limite",
  detalle: "El servicio de cotizaciones recibe demasiados pedidos.",
});

export const falloDelServicio = (status: number): Fallo => ({
  ok: false,
  motivo: "servicio",
  detalle: `El servicio de cotizaciones falló (HTTP ${status}).`,
});

export const falloPorRespuestaInesperada = (status: number): Fallo => ({
  ok: false,
  motivo: "respuesta_invalida",
  detalle: `El servicio respondió HTTP ${status}.`,
});

export const falloPorCuerpoInvalido = (detalle = "El servicio de cotizaciones respondió algo inesperado."): Fallo => ({
  ok: false,
  motivo: "respuesta_invalida",
  detalle,
});

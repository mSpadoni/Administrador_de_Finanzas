import "server-only";

// El registro (log) del servidor, en un solo formato: una línea de JSON por evento, así se puede buscar y filtrar en los
// logs de Vercel. Acá se loguea todo lo que no le llega a la persona (el detalle técnico de un error, por ejemplo).

type Contexto = Record<string, unknown>;

/** El error como datos que entran en un JSON: nombre, mensaje, stack y su causa (un `Error` no se serializa solo). */
function describir(error: unknown): unknown {
  if (!(error instanceof Error)) return String(error);
  return {
    nombre: error.name,
    mensaje: error.message,
    stack: error.stack,
    causa: error.cause === undefined ? undefined : describir(error.cause),
  };
}

/** Algo que pasó y vale la pena medir o revisar después (ej. cuánto tardó una respuesta). */
export function registrarEvento(evento: string, datos: Contexto = {}): void {
  console.info(JSON.stringify({ nivel: "info", evento, ...datos }));
}

/** Algo raro que no corta nada (ej. una fila inválida que se omite). */
export function registrarAviso(evento: string, datos: Contexto = {}): void {
  console.warn(JSON.stringify({ nivel: "aviso", evento, ...datos }));
}

/** Una falla: el detalle técnico queda acá y a la persona le llega solo un mensaje entendible. */
export function registrarError(evento: string, error: unknown, datos: Contexto = {}): void {
  console.error(JSON.stringify({ nivel: "error", evento, ...datos, error: describir(error) }));
}

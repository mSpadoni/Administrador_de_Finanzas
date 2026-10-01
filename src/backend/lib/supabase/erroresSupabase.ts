// Los errores de backend/lib/supabase: cuando la base (o Supabase Auth) responde con un error. No es un error de la
// persona: el detalle queda en el log y a la persona le llega el mensaje genérico (ver app/api/respuestaDeError.ts).

/** El código de Postgres de «ya existe una fila con esa clave» (unique_violation). */
const CODIGO_CLAVE_DUPLICADA = "23505";

/**
 * Una consulta a Supabase que falló. `message` dice qué se estaba haciendo y qué respondió Supabase; `codigo` es el código
 * de error de Postgres (si Supabase lo informó), para distinguir una falla esperable (clave repetida) de una caída.
 */
export class ErrorDeBase extends Error {
  override name = "ErrorDeBase";

  constructor(
    message: string,
    readonly codigo?: string
  ) {
    super(message);
  }
}

/** Corta con el error de una consulta: `queSeHacia` ("No se pudo leer…") y lo que respondió Supabase. */
export function lanzarErrorDeBase(queSeHacia: string, respuestaDeSupabase: string, codigo?: string): never {
  throw new ErrorDeBase(`${queSeHacia}: ${respuestaDeSupabase}`, codigo);
}

/** ¿La consulta falló porque ya existe una fila con esa clave (ej. una conversación con ese id)? */
export function esClaveDuplicada(error: unknown): boolean {
  return error instanceof ErrorDeBase && error.codigo === CODIGO_CLAVE_DUPLICADA;
}

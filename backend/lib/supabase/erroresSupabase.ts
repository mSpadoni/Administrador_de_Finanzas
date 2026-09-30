// Los errores de backend/lib/supabase: cuando la base (o Supabase Auth) responde con un error. No es un error de la
// persona: el detalle queda en el log y a la persona le llega el mensaje genérico (ver app/api/respuestaDeError.ts).

/** Una consulta a Supabase que falló. `message` dice qué se estaba haciendo y qué respondió Supabase. */
export class ErrorDeBase extends Error {
  override name = "ErrorDeBase";
}

/** Corta con el error de una consulta: `queSeHacia` ("No se pudo leer…") y lo que respondió Supabase. */
export function lanzarErrorDeBase(queSeHacia: string, respuestaDeSupabase: string): never {
  throw new ErrorDeBase(`${queSeHacia}: ${respuestaDeSupabase}`);
}

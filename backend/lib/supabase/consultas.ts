import { lanzarErrorDeBase } from "./erroresSupabase";

// Ayudas para los repositorios: lo que se repetía en cada consulta a Supabase.

/** Lo que devuelve una consulta de Supabase: o trae los datos (`error: null`), o trae el error. */
type Respuesta = { data: unknown; error: { message: string; code?: string } | null };

/** Los datos de la respuesta cuando salió bien (la rama con `error: null`). */
type DatosSiSalioBien<R extends Respuesta> = Extract<R, { error: null }>["data"];

/**
 * Los datos de una consulta, o un Error que dice qué se estaba haciendo y qué respondió Supabase.
 * Ej: `datosOError(await supabase.from("mensajes").select(...), "No se pudieron leer los mensajes")`.
 */
export function datosOError<R extends Respuesta>(respuesta: R, queSeHacia: string): DatosSiSalioBien<R> {
  if (respuesta.error) return lanzarErrorDeBase(queSeHacia, respuesta.error.message, respuesta.error.code);
  return respuesta.data as DatosSiSalioBien<R>;
}

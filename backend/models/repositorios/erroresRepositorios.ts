import "server-only";
import { isAuthApiError, isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { esClaveDuplicada } from "@/backend/lib/supabase/erroresSupabase";

// Los errores de backend/models/repositorios: lo que los repositorios traducen de la base para que los controllers no
// tengan que saber de Postgres (códigos, claves, RLS).

/** Se quiso crear una conversación con un id que ya existe (y, como RLS no la deja ver, es de otra persona). */
export class ConversacionYaExisteError extends Error {
  override name = "ConversacionYaExisteError";
}

/**
 * Corta con el error de crear una conversación: si el id ya existe, con `ConversacionYaExisteError`; cualquier otra falla
 * (la base caída, RLS, un bug) sigue de largo tal cual.
 */
export function lanzarFalloAlCrearConversacion(error: unknown): never {
  if (!esClaveDuplicada(error)) throw error;
  throw new ConversacionYaExisteError("No se pudo crear la conversación: ya existe una con ese id.", { cause: error });
}

/** Supabase Auth no respondió (caído o sin red): no es lo mismo que no tener sesión. */
export class AuthNoRespondeError extends Error {
  override name = "AuthNoRespondeError";
}

/**
 * Corta si el error de Supabase Auth es porque el servicio no respondió (sin red, o un 5xx). Cualquier otro error (sin
 * sesión, sesión vencida o inválida) no corta: quiere decir que no hay nadie logueado.
 */
export function lanzarSiAuthNoRespondio(error: AuthError | null): void {
  if (!error) return;
  const noRespondio = isAuthRetryableFetchError(error) || (isAuthApiError(error) && error.status >= 500);
  if (noRespondio) throw new AuthNoRespondeError("Supabase Auth no respondió.", { cause: error });
}

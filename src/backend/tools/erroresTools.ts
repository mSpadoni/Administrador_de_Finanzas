import "server-only";
import { fallo, type Fallo } from "@/backend/lib/erroresLib";

// Los errores de backend/tools. Las tools no lanzan: si algo falla por dentro (la base, un servicio, un bug), devuelven un
// fallo como cualquier otro `{ ok: false, motivo, detalle }`, para que el modelo se lo explique a la persona y la respuesta
// siga. El detalle técnico queda en el log.

/** Una tool que falló por algo que no es un dato mal pedido ni un servicio externo conocido. */
export type FalloInternoDeLaTool = Fallo<"error_interno">;

/** El fallo que devuelve una tool cuando algo se rompió por dentro. */
export const falloInternoDeLaTool = (): FalloInternoDeLaTool =>
  fallo("error_interno", "No se pudo completar la operación por un problema nuestro. Probá de nuevo en un rato.");

import { z } from "zod";
import { lanzarConfiguracionIncompleta } from "./erroresLib";

// Todas las validaciones con Zod de backend/lib: las variables de entorno de cada servicio (ver .env.example). Los archivos
// de esta carpeta llaman a las funciones de acá: no importan zod (lo de dolarapi.com está en dolar/validacionDolar.ts).
// No lleva `server-only` porque env.ts también lo usa el middleware (Edge).

// ---------------------------------------------------------------------------------------------------------------
// Variables de entorno

/** Una variable vacía cuenta como no definida (en .env.example quedan escritas pero sin valor). */
const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((valor) => (valor === "" ? undefined : valor), esquema.optional());
const requerida = (nombre: string) => z.string({ error: `Falta ${nombre}` }).min(1, `Falta ${nombre}`);
const url = (nombre: string) => z.url(`${nombre} tiene que ser una URL (ej. https://…)`);

/** Supabase: URL del proyecto y publishable key (pública a propósito: la seguridad la da RLS). */
export const VariablesDeSupabaseSchema = z.object({
  SUPABASE_URL: requerida("SUPABASE_URL").pipe(url("SUPABASE_URL")),
  SUPABASE_PUBLISHABLE_KEY: requerida("SUPABASE_PUBLISHABLE_KEY"),
});

/** OpenAI: la key es obligatoria; la URL y el modelo son opcionales (tienen valor por defecto en env.ts). */
export const VariablesDeOpenAISchema = z.object({
  OPENAI_API_KEY: requerida("OPENAI_API_KEY"),
  OPENAI_BASE_URL: opcional(url("OPENAI_BASE_URL")),
  OPENAI_MODEL: opcional(z.string()),
});

/** La clave con la que el servidor firma las respuestas del asistente: secreta y larga (al menos 32 caracteres). */
export const VariablesDeFirmaSchema = z.object({
  FIRMA_DE_MENSAJES: requerida("FIRMA_DE_MENSAJES").pipe(
    z.string().min(32, "FIRMA_DE_MENSAJES tiene que tener al menos 32 caracteres")
  ),
});

/** Valida las variables de un servicio; si algo falla, un solo error con todos los problemas. */
export function validarVariablesDeEntorno<T extends z.ZodType>(
  servicio: string,
  esquema: T,
  entorno: Record<string, string | undefined>
): z.infer<T> {
  const resultado = esquema.safeParse(entorno);
  if (!resultado.success) {
    return lanzarConfiguracionIncompleta(
      servicio,
      resultado.error.issues.map((problema) => problema.message).join("; ")
    );
  }
  return resultado.data;
}

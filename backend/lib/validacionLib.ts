import { z } from "zod";
import { lanzarConfiguracionIncompleta } from "./erroresLib";

// Todas las validaciones con Zod de backend/lib: las variables de entorno de cada servicio (ver .env.example) y lo
// que responde dolarapi.com. Los archivos de esta carpeta llaman a las funciones de acá: no importan zod.
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

// ---------------------------------------------------------------------------------------------------------------
// Lo que responde dolarapi.com (/v1/dolares)

/** Lo que responde dolarapi. Se valida todo lo que se usa: una cotización rara no llega al usuario. */
const RespuestaDeDolarapiSchema = z.array(
  z.object({
    casa: z.string(),
    compra: z.number().positive(),
    venta: z.number().positive(),
    fechaActualizacion: z.string(),
  })
);

/** Una casa de cambio como la publica dolarapi (incluye casas que la app no usa). */
export type CasaDeDolarapi = z.infer<typeof RespuestaDeDolarapiSchema>[number];

/** Las casas de la respuesta de dolarapi, o null si lo que llegó no tiene la forma esperada. */
export function validarRespuestaDeDolarapi(json: unknown): CasaDeDolarapi[] | null {
  const resultado = RespuestaDeDolarapiSchema.safeParse(json);
  return resultado.success ? resultado.data : null;
}

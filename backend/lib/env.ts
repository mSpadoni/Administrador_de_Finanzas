import { z } from "zod";

// Variables de entorno, en un solo lugar y validadas con Zod (ver .env.example).
// - Se leen al usarlas, no al importar el módulo: los tests pueden cambiarlas y una variable que falta de un servicio
//   no afecta a los otros (si falta la de OpenAI, el login con Supabase sigue andando).
// - No lleva `server-only` porque también la usa el middleware (Edge). Las views no la pueden importar (regla de ESLint).

export const URL_API_OPENAI_POR_DEFECTO = "https://api.openai.com/v1";
export const MODELO_OPENAI_POR_DEFECTO = "gpt-4.1";

/** Falta una variable de entorno o tiene un valor inválido. El mensaje dice cuál y dónde verlo. */
export class ErrorDeConfiguracion extends Error {
  override name = "ErrorDeConfiguracion";
}

/** Una variable vacía cuenta como no definida (en .env.example quedan escritas pero sin valor). */
const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((valor) => (valor === "" ? undefined : valor), esquema.optional());
const requerida = (nombre: string) => z.string({ error: `Falta ${nombre}` }).min(1, `Falta ${nombre}`);
const url = (nombre: string) => z.url(`${nombre} tiene que ser una URL (ej. https://…)`);

/** Valida las variables de un servicio; si algo falla, un solo error con todos los problemas. */
function leer<T extends z.ZodType>(servicio: string, esquema: T): z.infer<T> {
  const resultado = esquema.safeParse(process.env);
  if (!resultado.success) {
    const problemas = resultado.error.issues.map((problema) => problema.message).join("; ");
    throw new ErrorDeConfiguracion(`Configuración de ${servicio} incompleta: ${problemas} (ver .env.example).`);
  }
  return resultado.data;
}

/** Supabase: URL del proyecto y publishable key (pública a propósito: la seguridad la da RLS). */
export function envSupabase(): { url: string; key: string } {
  const variables = leer(
    "Supabase",
    z.object({
      SUPABASE_URL: requerida("SUPABASE_URL").pipe(url("SUPABASE_URL")),
      SUPABASE_PUBLISHABLE_KEY: requerida("SUPABASE_PUBLISHABLE_KEY"),
    })
  );
  return { url: variables.SUPABASE_URL, key: variables.SUPABASE_PUBLISHABLE_KEY };
}

/** OpenAI: la key es obligatoria; la URL y el modelo tienen valor por defecto. */
export function envOpenAI(): { apiKey: string; baseURL: string; modelo: string } {
  const variables = leer(
    "OpenAI",
    z.object({
      OPENAI_API_KEY: requerida("OPENAI_API_KEY"),
      OPENAI_BASE_URL: opcional(url("OPENAI_BASE_URL")),
      OPENAI_MODEL: opcional(z.string()),
    })
  );
  return {
    apiKey: variables.OPENAI_API_KEY,
    baseURL: variables.OPENAI_BASE_URL ?? URL_API_OPENAI_POR_DEFECTO,
    modelo: variables.OPENAI_MODEL ?? MODELO_OPENAI_POR_DEFECTO,
  };
}

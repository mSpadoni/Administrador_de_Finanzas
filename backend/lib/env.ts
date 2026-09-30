import { VariablesDeOpenAISchema, VariablesDeSupabaseSchema, validarVariablesDeEntorno } from "./validacionLib";

// Variables de entorno, en un solo lugar y validadas con Zod (ver .env.example y validacionLib.ts).
// - Se leen al usarlas, no al importar el módulo: los tests pueden cambiarlas y una variable que falta de un servicio
//   no afecta a los otros (si falta la de OpenAI, el login con Supabase sigue andando).
// - No lleva `server-only` porque también la usa el middleware (Edge). Las views no la pueden importar (regla de ESLint).
// - Es el único archivo que lee `process.env`.

export const URL_API_OPENAI_POR_DEFECTO = "https://api.openai.com/v1";
export const MODELO_OPENAI_POR_DEFECTO = "gpt-4.1";

/** Supabase: URL del proyecto y publishable key (pública a propósito: la seguridad la da RLS). */
export function envSupabase(): { url: string; key: string } {
  const variables = validarVariablesDeEntorno("Supabase", VariablesDeSupabaseSchema, process.env);
  return { url: variables.SUPABASE_URL, key: variables.SUPABASE_PUBLISHABLE_KEY };
}

/** OpenAI: la key es obligatoria; la URL y el modelo tienen valor por defecto. */
export function envOpenAI(): { apiKey: string; baseURL: string; modelo: string } {
  const variables = validarVariablesDeEntorno("OpenAI", VariablesDeOpenAISchema, process.env);
  return {
    apiKey: variables.OPENAI_API_KEY,
    baseURL: variables.OPENAI_BASE_URL ?? URL_API_OPENAI_POR_DEFECTO,
    modelo: variables.OPENAI_MODEL ?? MODELO_OPENAI_POR_DEFECTO,
  };
}

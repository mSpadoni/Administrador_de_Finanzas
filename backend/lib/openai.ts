import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { envOpenAI } from "@/backend/lib/env";

/**
 * El modelo de OpenAI listo para `streamText`, con la key, la URL y el modelo de las variables de entorno
 * (ver backend/lib/env.ts). Usa la API de chat completions (`.chat`), que también entienden los servicios
 * compatibles con OpenAI si algún día cambia OPENAI_BASE_URL.
 */
export function crearModeloOpenAI(modelo?: string): LanguageModel {
  const { apiKey, baseURL, modelo: modeloConfigurado } = envOpenAI();
  return createOpenAI({ apiKey, baseURL }).chat(modelo ?? modeloConfigurado);
}

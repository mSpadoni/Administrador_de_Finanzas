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

/** El modelo ya creado y la configuración con la que se creó. */
let modeloGuardado: { configuracion: string; modelo: LanguageModel } | null = null;

/**
 * El modelo de lenguaje de la app. Es el único lugar que lo crea: la primera vez que alguien lo pide (el agente o el
 * titulador) se crea con las variables de entorno, y después se reusa el mismo. Si las variables cambian (pasa en los
 * tests), se vuelve a crear. Si falta la clave, lanza el error de configuración (ver backend/lib/env.ts).
 */
export function modeloDeOpenAI(): LanguageModel {
  const configuracion = JSON.stringify(envOpenAI());
  if (modeloGuardado?.configuracion !== configuracion) {
    modeloGuardado = { configuracion, modelo: crearModeloOpenAI() };
  }
  return modeloGuardado.modelo;
}

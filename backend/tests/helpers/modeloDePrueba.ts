import { APICallError } from "ai";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";

// Modelos de lenguaje de prueba para probar NUESTRA orquestación del chat (guardar, límites, errores, timeout,
// streaming, historial) sin depender de internet ni de lo que decida un LLM real. Usan MockLanguageModelV4, el
// doble oficial del AI SDK, que cumple el mismo contrato que un proveedor real (OpenAI).
// La conducta del modelo real (qué tool elige) se prueba aparte, en externos/.

const USO = {
  inputTokens: { total: 120, noCache: 120, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 30, text: 30, reasoning: 0 },
};

/**
 * Un modelo que responde `texto` en streaming. El texto llega en ráfagas de varias palabras (como llega de un
 * proveedor real), para poder comprobar que la app lo muestra palabra por palabra.
 */
export function modeloQueResponde(texto: string) {
  const rafagas = texto.match(/(\S+\s*){1,3}/g) ?? [];
  return new MockLanguageModelV4({
    modelId: "modelo-de-prueba",
    doStream: async () => ({
      stream: simulateReadableStream({
        initialDelayInMs: null,
        chunkDelayInMs: 0,
        chunks: [
          { type: "stream-start" as const, warnings: [] },
          { type: "text-start" as const, id: "t1" },
          ...rafagas.map((delta) => ({ type: "text-delta" as const, id: "t1", delta })),
          { type: "text-end" as const, id: "t1" },
          { type: "finish" as const, usage: USO, finishReason: { unified: "stop" as const, raw: "stop" } },
        ],
      }),
    }),
  });
}

/** Un error real de la API de OpenAI (la misma clase que arma el SDK al recibir una respuesta con error). */
export function errorDeLaApi(statusCode: number, cuerpo: Record<string, unknown>) {
  return new APICallError({
    message: String(cuerpo.message),
    url: "https://api.openai.com/v1/chat/completions",
    requestBodyValues: {},
    statusCode,
    responseBody: JSON.stringify({ error: cuerpo }),
    isRetryable: statusCode === 429 || statusCode >= 500,
  });
}

/** Un modelo que falla apenas se le pide la respuesta (ej. clave inválida, sin saldo). */
export function modeloQueFalla(error: unknown) {
  return new MockLanguageModelV4({
    modelId: "modelo-de-prueba",
    doStream: async () => {
      throw error;
    },
  });
}

/**
 * Un modelo que responde `texto` de una vez (sin streaming), como cuando el código usa `generateText` (ej. para ponerle
 * título a una conversación). `pedidos` guarda lo que recibió, para comprobar qué se le mostró.
 */
export function modeloQueGenera(texto: string) {
  const pedidos: unknown[] = [];
  const modelo = new MockLanguageModelV4({
    modelId: "modelo-de-prueba",
    doGenerate: async (opciones) => {
      pedidos.push(opciones.prompt);
      return {
        content: [{ type: "text" as const, text: texto }],
        finishReason: { unified: "stop" as const, raw: "stop" },
        usage: USO,
        warnings: [],
      };
    },
  });
  return { modelo, pedidos };
}

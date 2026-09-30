import "server-only";
import type { UIMessageChunk } from "ai";
import type { ErrorDeAplicacion } from "@/backend/erroresBackend";
import type { CuerpoDeError } from "@/shared/erroresShared";
import { errorDelAsistente } from "./erroresAsistente";

// Cómo viajan los errores por el stream del chat (lo que llega al navegador mientras el asistente responde).

/**
 * El texto de un error dentro del stream del chat: el mismo CuerpoDeError que responde la API, en JSON, así el
 * navegador lee el código igual en los dos casos. (El stream solo admite un texto como error.)
 */
export function textoDeErrorEnStream(error: ErrorDeAplicacion): string {
  const cuerpo: CuerpoDeError = { error: error.publico };
  return JSON.stringify(cuerpo);
}

/**
 * Cuando se vence el timeout, el SDK corta el stream con un evento "abort", no "error": en el navegador se vería
 * como si el asistente se hubiera callado. Este paso lo convierte en un error con el mensaje de siempre.
 * (Si el que corta es el usuario con "Detener", el navegador ya cerró la conexión y este evento no le llega.)
 */
export function timeoutComoError<Metadatos = unknown>(): TransformStream<
  UIMessageChunk<Metadatos>,
  UIMessageChunk<Metadatos>
> {
  return new TransformStream({
    transform(evento, salida) {
      if (evento.type === "abort" && /TimeoutError/.test(evento.reason ?? "")) {
        salida.enqueue({ type: "error", errorText: textoDeErrorEnStream(errorDelAsistente("demorado")) });
      } else {
        salida.enqueue(evento);
      }
    },
  });
}

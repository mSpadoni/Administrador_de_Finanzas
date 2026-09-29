import "server-only";
import { APICallError, RetryError, type UIMessageChunk } from "ai";
import { ErrorDeAplicacion } from "@/backend/errores";
import type { CuerpoDeError } from "@/shared/errores";

// Los errores del modelo (OpenAI, AI SDK) traducidos a errores de la app: un código estable y un mensaje para el
// usuario. Lo usan el controller (antes de empezar el stream) y el agente (en el medio del stream).
// Acá no se loguea: lo hace quien maneja el error (la ruta, o el onError del stream), una sola vez.

/** Lo que ve el usuario cuando el modelo tarda demasiado. */
export const MENSAJE_TIMEOUT = "El asistente tardó demasiado en responder. Probá de nuevo en unos segundos.";

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
        salida.enqueue({
          type: "error",
          errorText: textoDeErrorEnStream(new ErrorDeAplicacion("asistente_demorado", MENSAJE_TIMEOUT)),
        });
      } else {
        salida.enqueue(evento);
      }
    },
  });
}

/** ¿El error es de que la cuenta de OpenAI se quedó sin saldo? (llega como 429, igual que el exceso de consultas) */
function esSinSaldo(error: APICallError): boolean {
  // Hoy llega como type "insufficient_quota" + code "credit_balance_exhausted"; antes el code era "insufficient_quota".
  return /insufficient_quota|credit_balance_exhausted/.test(error.responseBody ?? "");
}

/**
 * Traduce un error del proveedor a un ErrorDeAplicacion. El original queda en `cause` para los logs; al usuario
 * nunca le llega (ni la clave, ni el cuerpo de la respuesta de OpenAI).
 * `X.isInstance(error)` pregunta "¿este error es de la clase X?" (cada tipo de falla tiene su clase).
 */
export function traducirError(error: unknown): ErrorDeAplicacion {
  if (error instanceof ErrorDeAplicacion) return error;

  // Si se agotaron los reintentos, el SDK envuelve el error: lo que importa es el último.
  const causa = RetryError.isInstance(error) ? error.lastError : error;

  // El timeout lo corta el SDK con un DOMException de nombre "TimeoutError".
  if (causa instanceof Error && causa.name === "TimeoutError") {
    return new ErrorDeAplicacion("asistente_demorado", MENSAJE_TIMEOUT, { cause: error });
  }
  if (APICallError.isInstance(causa)) {
    // Sin saldo no se arregla esperando: cae abajo, en el error de configuración.
    if (causa.statusCode === 429 && !esSinSaldo(causa)) {
      return new ErrorDeAplicacion(
        "asistente_saturado",
        "El asistente está recibiendo demasiadas consultas. Esperá un minuto y volvé a intentar.",
        { cause: error }
      );
    }
    // 5xx: el proveedor está caído o saturado. Es pasajero, no de configuración.
    if (causa.statusCode !== undefined && causa.statusCode >= 500) {
      return new ErrorDeAplicacion(
        "asistente_saturado",
        "El asistente está saturado en este momento. Esperá un minuto y volvé a intentar.",
        { cause: error }
      );
    }
  }
  // Clave inválida, sin permisos, modelo inexistente, sin crédito, variable faltante: es un problema de
  // configuración, no del usuario.
  return new ErrorDeAplicacion(
    "asistente_no_disponible",
    "El asistente no está disponible en este momento. Probá de nuevo más tarde; si sigue pasando, avisale a quien administra la app.",
    { cause: error }
  );
}

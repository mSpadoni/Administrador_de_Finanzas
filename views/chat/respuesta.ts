import { textoDe, type AsistenteUIMessage } from "@/shared/chat";
import { tituloDesde } from "@/shared/conversaciones";

// Qué hace la vista cuando termina una respuesta del asistente. Funciones puras: las usa useChatDelAsistente.

/** Lo que lee el lector de pantalla cuando el asistente termina de responder (la respuesta entera, una sola vez). */
export function anuncioDeRespuesta(respuesta: AsistenteUIMessage): string {
  return `El asistente respondió: ${textoDe(respuesta)}`;
}

/**
 * El título de la conversación para el sidebar: el mismo que le pone el servidor al crearla (a partir del primer
 * mensaje del usuario), así el sidebar lo muestra sin volver a consultar la base.
 */
export function tituloDeLaConversacion(mensajes: AsistenteUIMessage[]): string {
  const primero = mensajes.find((mensaje) => mensaje.role === "user");
  return tituloDesde(primero ? textoDe(primero) : "");
}

/**
 * Atajos siempre visibles debajo del campo: el usuario puede cambiar de tarea en cualquier momento (heurística #6,
 * reconocer antes que recordar).
 */
export const ATAJOS = [
  { titulo: "¿Cómo vengo este mes?", mensaje: "¿Cómo vengo este mes? Mostrame el resumen." },
  { titulo: "Registrar un gasto", mensaje: "Registrá un gasto: " },
  { titulo: "¿A cuánto está el dólar?", mensaje: "¿A cuánto está el dólar hoy?" },
  { titulo: "¿En qué gasto más?", mensaje: "¿En qué categorías gasté más este mes?" },
] as const;

/** Un atajo completo (termina en ".") se manda directo; uno que termina en ":" espera que el usuario lo complete. */
export function atajoEstaCompleto(mensaje: string): boolean {
  return mensaje.trimEnd().endsWith(".");
}

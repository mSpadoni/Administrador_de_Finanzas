import "server-only";
import { crearToolsDolar } from "@/backend/tools/dolar.tools";

/**
 * Todas las tools del asistente, en un solo lugar. De acá sale también el tipo de los mensajes que ve el navegador
 * (shared/chat.ts): si una tool cambia de nombre, de datos o de resultado, la vista deja de compilar.
 */
export function crearToolsAsistente() {
  return {
    ...crearToolsDolar(),
  };
}

/** El tipo del conjunto de tools del asistente (para derivar el tipo de los mensajes). */
export type ToolsDelAsistente = ReturnType<typeof crearToolsAsistente>;

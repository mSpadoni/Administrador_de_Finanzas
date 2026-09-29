import "server-only";
import { crearToolsDolar } from "@/backend/tools/dolar.tools";
import { crearToolsMovimientos, type DependenciasDeMovimientos } from "@/backend/tools/movimientos.tools";

/**
 * Todas las tools del asistente, en un solo lugar. De acá sale también el tipo de los mensajes que ve el navegador
 * (shared/chat.ts): si una tool cambia de nombre, de datos o de resultado, la vista deja de compilar.
 * Sin dependencias usa las de la app (el repositorio con la sesión del pedido, dolarapi.com y el día de hoy).
 */
export function crearToolsAsistente(dependencias: DependenciasDeMovimientos = {}) {
  return {
    ...crearToolsMovimientos(dependencias),
    ...crearToolsDolar(dependencias.dolar),
  };
}

/** El tipo del conjunto de tools del asistente (para derivar el tipo de los mensajes). */
export type ToolsDelAsistente = ReturnType<typeof crearToolsAsistente>;

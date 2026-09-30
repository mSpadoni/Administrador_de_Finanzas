import "server-only";
import type { ClienteDolar } from "@/backend/lib/dolar";
import { crearToolsDolar } from "@/backend/tools/dolar.tools";
import { crearToolsMovimientos, type DependenciasDeMovimientos } from "@/backend/tools/movimientos.tools";

/** Lo que se le puede pasar a las tools del asistente para reemplazar sus piezas (útil en los tests). */
export type DependenciasDelAsistente = DependenciasDeMovimientos & { dolar?: ClienteDolar };

/**
 * Todas las tools del asistente, en un solo lugar. De acá sale también el tipo de los mensajes que ve el navegador
 * (shared/chat.ts): si una tool cambia de nombre, de datos o de resultado, la vista deja de compilar.
 * Sin dependencias usa las de la app (el controller de movimientos con la sesión del pedido y dolarapi.com).
 */
export function crearToolsAsistente({ movimientos, dolar }: DependenciasDelAsistente = {}) {
  return {
    ...crearToolsMovimientos({ movimientos }),
    ...crearToolsDolar(dolar),
  };
}

/** El tipo del conjunto de tools del asistente (para derivar el tipo de los mensajes). */
export type ToolsDelAsistente = ReturnType<typeof crearToolsAsistente>;

import type { CodigoDeError } from "@/shared/errores";

// Cuántos mensajes puede mandar un usuario al asistente. Cada mensaje gasta crédito de OpenAI: sin límite, un usuario
// (o un script con su sesión) podría agotarlo. Lógica pura: los conteos los trae el repositorio de conversaciones.

export type LimitesDeUso = { porMinuto: number; porDia: number };

/** Holgados para estudiar (una consulta cada 6 s sostenida es mucho), cortos para un abuso. */
export const LIMITES_DE_USO: LimitesDeUso = { porMinuto: 10, porDia: 150 };

/** Cuántos mensajes mandó el usuario en el último minuto y en las últimas 24 horas. */
export type UsoReciente = { ultimoMinuto: number; ultimoDia: number };

/** Qué límite alcanzó el usuario, con el código (para el navegador) y el mensaje para mostrarle. */
export type LimiteAlcanzado = { codigo: Extract<CodigoDeError, `limite_${string}`>; mensaje: string };

/** Si el usuario ya llegó a un límite, cuál; si puede seguir, null. El del día pesa más: esperar un minuto no alcanza. */
export function limiteAlcanzado(uso: UsoReciente, limites: LimitesDeUso = LIMITES_DE_USO): LimiteAlcanzado | null {
  if (uso.ultimoDia >= limites.porDia) {
    return {
      codigo: "limite_por_dia",
      mensaje: `Llegaste al máximo de ${limites.porDia} mensajes por día. Mañana podés seguir practicando.`,
    };
  }
  if (uso.ultimoMinuto >= limites.porMinuto) {
    return { codigo: "limite_por_minuto", mensaje: "Mandaste muchos mensajes seguidos. Esperá un minuto y seguí." };
  }
  return null;
}

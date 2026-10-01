import type { CodigoDeError } from "@/shared/erroresShared";

// Cuántas veces puede una persona pedirle algo al asistente que gaste crédito de OpenAI (un mensaje del chat o el título
// de una conversación): sin límite, una persona (o un script con su sesión) podría agotarlo. Lógica pura: la cuenta la
// hace la base, en un solo paso (repositorios/uso.model.ts y la función consumir_cuota de la migración).

/** Lo que gasta crédito: un mensaje del chat o el título de una conversación. Cada uno tiene su propia cuota. */
export type TipoDeUso = "mensaje" | "titulo";

export type LimitesDeUso = { porMinuto: number; porDia: number };

/** Holgados para el uso normal (una consulta cada 6 s sostenida es mucho), cortos para un abuso. */
export const LIMITES_DE_USO: LimitesDeUso = { porMinuto: 10, porDia: 150 };

/** Qué límite se alcanzó: el del minuto o el del día. */
export type CodigoDeLimite = Extract<CodigoDeError, `limite_${string}`>;

/** Qué límite alcanzó la persona, con el código (para el navegador) y el mensaje para mostrarle. */
export type LimiteAlcanzado = { codigo: CodigoDeLimite; mensaje: string };

/** El límite alcanzado, con el mensaje para la persona; null si puede seguir. */
export function limiteAlcanzado(
  codigo: CodigoDeLimite | null,
  limites: LimitesDeUso = LIMITES_DE_USO
): LimiteAlcanzado | null {
  if (codigo === "limite_por_dia") {
    return {
      codigo,
      mensaje: `Llegaste al máximo de ${limites.porDia} mensajes por día. Mañana podés seguir.`,
    };
  }
  if (codigo === "limite_por_minuto") {
    return { codigo, mensaje: "Mandaste muchos mensajes seguidos. Esperá un minuto y seguí." };
  }
  return null;
}

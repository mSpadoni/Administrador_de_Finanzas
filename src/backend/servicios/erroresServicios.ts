import "server-only";
import type { MotivoDelDolar } from "@/backend/lib/dolar/erroresDolar";
import { fallo, type Fallo } from "@/backend/lib/erroresLib";
import { ErrorDeDominio } from "@/backend/models/dominio/erroresDominio";

// Todos los fallos de backend/servicios. No se lanzan: los servicios los devuelven como `{ ok: false, motivo, detalle }`
// para que el asistente se los explique a la persona (o corrija el dato y vuelva a intentar).

/** Por qué un servicio de movimientos no pudo hacer lo que se le pidió (un fallo de la cotización o un dato mal pedido). */
export type FalloDeMovimientos = Fallo<MotivoDelDolar | "datos_invalidos" | "no_encontrado">;

export const datosInvalidos = (detalle: string): FalloDeMovimientos => fallo("datos_invalidos", detalle);

/**
 * Por qué no se pudo armar el período pedido. Solo el rango al revés (un error del dominio) es un dato mal pedido; cualquier
 * otro error es un bug y sigue de largo.
 */
export function falloDelPeriodoPedido(error: unknown): FalloDeMovimientos {
  if (error instanceof ErrorDeDominio) return datosInvalidos(error.message);
  throw error;
}

export const movimientoNoEncontrado = (): FalloDeMovimientos =>
  fallo("no_encontrado", "No hay un movimiento tuyo con ese id.");

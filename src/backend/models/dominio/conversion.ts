import { ESTRATEGIA_POR_MONEDA } from "./moneda";
import type { Moneda } from "./movimiento";

// Convertir un monto entre pesos y dólares con un valor de cotización. Lógica pura: la cotización entra por parámetro y
// la cuenta de cada moneda está en moneda.ts.

/** La otra moneda: los dólares se convierten a pesos y los pesos, a dólares. */
export const monedaDestino = (de: Moneda): Moneda => ESTRATEGIA_POR_MONEDA[de].destino;

/**
 * El monto convertido con un valor de cotización, a dos decimales. De dólares a pesos es la misma cuenta con la que se
 * guarda un movimiento (monto × cotización, en enteros); de pesos a dólares, monto ÷ cotización.
 */
export function convertirMonto(monto: number, de: Moneda, valor: number): number {
  return ESTRATEGIA_POR_MONEDA[de].convertir(monto, valor);
}

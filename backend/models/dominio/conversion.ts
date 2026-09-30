import { redondear } from "./dinero";
import { montoEnPesos, type Moneda, type TipoDeDolar } from "./movimiento";

// Convertir un monto entre pesos y dólares con un valor de cotización. Lógica pura: la cotización entra por parámetro.

/** La otra moneda: los dólares se convierten a pesos y los pesos, a dólares. */
export const monedaDestino = (de: Moneda): Moneda => (de === "USD" ? "ARS" : "USD");

/**
 * El monto convertido con un valor de cotización, a dos decimales. De dólares a pesos es la misma cuenta con la que se
 * guarda un movimiento (monto × cotización, en enteros); de pesos a dólares, monto ÷ cotización.
 */
export function convertirMonto(monto: number, de: Moneda, tipoDeDolar: TipoDeDolar, valor: number): number {
  return de === "USD" ? montoEnPesos({ monto, moneda: "USD" }, { tipoDeDolar, valor }) : redondear(monto / valor);
}

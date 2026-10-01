import { aCentavos, aPesos, redondear } from "./dinero";
import { lanzarCotizacionEnUnMovimientoEnPesos, lanzarMovimientoEnDolaresSinCotizacion } from "./erroresDominio";
import type { CotizacionUsada, Moneda } from "./movimiento";

// Qué cambia según la moneda de un monto: cómo se pasa a pesos y cómo se convierte a la otra. Una estrategia por moneda, en
// vez de un `if (moneda === "USD")` repetido en cada cuenta. Lógica pura.

/** Lo que sabe hacer cada moneda con un monto. */
export type EstrategiaDeMoneda = {
  /** La otra moneda: los dólares se convierten a pesos y los pesos, a dólares. */
  destino: Moneda;
  /**
   * El monto en pesos de un movimiento en esta moneda. Pedir un monto en dólares sin cotización, o en pesos con
   * cotización, es un error de quien llama.
   */
  enPesos: (monto: number, cotizacion: CotizacionUsada | null) => number;
  /** El monto convertido a la otra moneda con un valor de cotización, a dos decimales. */
  convertir: (monto: number, valor: number) => number;
};

/**
 * Los dólares por el valor de la cotización, redondeado al centavo (con enteros, para que no aparezcan errores de punto
 * flotante): centavos × diezmilésimos (la cotización se guarda con 4 decimales) = centavos × 10.000, redondeado.
 */
function pesosDeDolares(dolares: number, valor: number): number {
  const centavos = BigInt(aCentavos(dolares));
  const diezmilesimos = BigInt(Math.round(valor * 10_000));
  const centavosEnPesos = (centavos * diezmilesimos + BigInt(5_000)) / BigInt(10_000);
  return aPesos(Number(centavosEnPesos));
}

/** Una estrategia por moneda: `Record` obliga a que cada moneda nueva tenga la suya (si no, no compila). */
export const ESTRATEGIA_POR_MONEDA: Record<Moneda, EstrategiaDeMoneda> = {
  ARS: {
    destino: "USD",
    enPesos: (monto, cotizacion) => (cotizacion ? lanzarCotizacionEnUnMovimientoEnPesos() : monto),
    convertir: (pesos, valor) => redondear(pesos / valor),
  },
  USD: {
    destino: "ARS",
    enPesos: (monto, cotizacion) =>
      cotizacion ? pesosDeDolares(monto, cotizacion.valor) : lanzarMovimientoEnDolaresSinCotizacion(),
    convertir: pesosDeDolares,
  },
};

import { aCentavos, aPesos } from "./dinero";
import {
  lanzarCotizacionEnUnMovimientoEnPesos,
  lanzarMovimientoEnDolaresSinCotizacion,
} from "./erroresDominio";
import type { DatosDeMovimiento } from "./validacionDominio";

export type { DatosDeMovimiento } from "./validacionDominio";

// Qué es un movimiento (gasto o ingreso) y cómo se calcula su monto en pesos. Vocabulario en CONTEXT.md; por qué el
// monto en pesos se fija con la cotización del día del registro, en docs/adr/0001. Lógica pura: sin base ni red.
// Las listas coinciden con los check de la tabla movimientos (migración 20260929190755_movimientos.sql).

export const TIPOS_DE_MOVIMIENTO = ["gasto", "ingreso"] as const;
export const MONEDAS = ["ARS", "USD"] as const;
export const MEDIOS_DE_PAGO = ["efectivo", "debito", "credito", "transferencia", "billetera_virtual"] as const;
export const TIPOS_DE_DOLAR = ["oficial", "blue", "mep", "tarjeta"] as const;

/** Cada tipo de movimiento tiene su lista fija de categorías. */
export const CATEGORIAS = {
  gasto: [
    "supermercado",
    "comida_afuera",
    "transporte",
    "servicios",
    "vivienda",
    "salud",
    "educacion",
    "ocio",
    "ropa",
    "suscripciones",
    "otros",
  ],
  ingreso: ["sueldo", "trabajo_independiente", "ventas", "regalos", "otros"],
} as const satisfies Record<(typeof TIPOS_DE_MOVIMIENTO)[number], readonly string[]>;

export type TipoDeMovimiento = (typeof TIPOS_DE_MOVIMIENTO)[number];
export type Moneda = (typeof MONEDAS)[number];
export type MedioDePago = (typeof MEDIOS_DE_PAGO)[number];
export type TipoDeDolar = (typeof TIPOS_DE_DOLAR)[number];
export type Categoria = (typeof CATEGORIAS)[TipoDeMovimiento][number];

/** La cotización con la que se pasó a pesos un movimiento en dólares. */
export type CotizacionUsada = { tipoDeDolar: TipoDeDolar; valor: number };

/**
 * Qué valor de la cotización se usa para pasar a pesos un movimiento en dólares: un gasto, el de venta (lo que
 * cuesta comprar el dólar); un ingreso, el de compra (lo que te dan al venderlo).
 */
export function valorDeCotizacion(
  tipo: TipoDeMovimiento,
  { compra, venta }: { compra: number; venta: number }
): number {
  return tipo === "gasto" ? venta : compra;
}

/** Un movimiento guardado: lo que describió la persona, más su id, su monto en pesos y la cotización usada. */
export type Movimiento = DatosDeMovimiento & {
  id: string;
  montoEnPesos: number;
  cotizacion: CotizacionUsada | null;
};

/**
 * El monto en pesos de un movimiento: el mismo si es en pesos; si es en dólares, el monto por la cotización,
 * redondeado al centavo (con enteros, para que no aparezcan errores de punto flotante). Pedir un monto en dólares
 * sin cotización, o en pesos con cotización, es un error de quien llama.
 */
export function montoEnPesos(datos: Pick<DatosDeMovimiento, "monto" | "moneda">, cotizacion: CotizacionUsada | null) {
  if (datos.moneda === "ARS") {
    if (cotizacion) return lanzarCotizacionEnUnMovimientoEnPesos();
    return datos.monto;
  }
  if (!cotizacion) return lanzarMovimientoEnDolaresSinCotizacion();
  // Centavos × diezmilésimos (la cotización se guarda con 4 decimales) = centavos × 10.000, redondeado.
  const centavos = BigInt(aCentavos(datos.monto));
  const diezmilesimos = BigInt(Math.round(cotizacion.valor * 10_000));
  const producto = centavos * diezmilesimos;
  const centavosEnPesos = (producto + BigInt(5_000)) / BigInt(10_000);
  return aPesos(Number(centavosEnPesos));
}

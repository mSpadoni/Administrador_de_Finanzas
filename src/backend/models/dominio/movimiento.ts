import { ESTRATEGIA_POR_MONEDA } from "./moneda";
import type { DatosDeMovimiento } from "./validacionDominio";

export type { DatosDeMovimiento } from "./validacionDominio";

// Qué es un movimiento (gasto o ingreso) y cómo se calcula su monto en pesos. Vocabulario en CONTEXT.md; por qué el
// monto en pesos se fija con la cotización del día del registro, en docs/adr/0001. Lógica pura: sin base ni red.
// Las listas coinciden con los check de la tabla movimientos (migración 20260929000000_esquema_inicial.sql).

export const TIPOS_DE_MOVIMIENTO = ["gasto", "ingreso"] as const;
export const MONEDAS = ["ARS", "USD"] as const;
export const MEDIOS_DE_PAGO = ["efectivo", "debito", "credito", "transferencia", "billetera_virtual"] as const;
export const TIPOS_DE_DOLAR = ["oficial", "blue", "mep", "tarjeta"] as const;

const CATEGORIAS_DE_GASTO = [
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
] as const;
const CATEGORIAS_DE_INGRESO = ["sueldo", "trabajo_independiente", "ventas", "regalos"] as const;

/** La categoría para lo que no encaja en ninguna otra: la tienen los gastos y los ingresos. */
const OTROS = "otros";

/** Cada tipo de movimiento tiene su lista fija de categorías. */
export const CATEGORIAS = {
  gasto: [...CATEGORIAS_DE_GASTO, OTROS],
  ingreso: [...CATEGORIAS_DE_INGRESO, OTROS],
} as const satisfies Record<(typeof TIPOS_DE_MOVIMIENTO)[number], readonly string[]>;

/** Todas las categorías, una sola vez cada una (con sus nombres exactos, para que los tipos los conozcan). */
export const TODAS_LAS_CATEGORIAS = [...CATEGORIAS_DE_GASTO, OTROS, ...CATEGORIAS_DE_INGRESO] as const;

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
 * redondeado al centavo (la cuenta de cada moneda está en moneda.ts). Pedir un monto en dólares sin cotización, o en
 * pesos con cotización, es un error de quien llama.
 */
export function montoEnPesos(datos: Pick<DatosDeMovimiento, "monto" | "moneda">, cotizacion: CotizacionUsada | null) {
  return ESTRATEGIA_POR_MONEDA[datos.moneda].enPesos(datos.monto, cotizacion);
}

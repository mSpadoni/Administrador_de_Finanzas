import { z } from "zod";

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

/** Un día del calendario, "AAAA-MM-DD" (la fecha del movimiento según la persona, en hora de Argentina). */
export const FechaSchema = z.iso.date("La fecha tiene que ser un día del calendario (AAAA-MM-DD).");

/** Plata: positiva y con a lo sumo dos decimales. */
const MontoSchema = z
  .number()
  .positive("El monto tiene que ser mayor que cero.")
  .refine((monto) => Math.round(monto * 100) / 100 === monto, "El monto puede tener a lo sumo dos decimales.");

/** Lo que describe la persona. El monto en pesos no: lo calcula la app con la cotización del día. */
export const DatosDeMovimientoSchema = z
  .object({
    tipo: z.enum(TIPOS_DE_MOVIMIENTO),
    monto: MontoSchema,
    moneda: z.enum(MONEDAS),
    categoria: z.string(),
    medioDePago: z.enum(MEDIOS_DE_PAGO),
    descripcion: z.string().trim().min(1, "La descripción está vacía.").max(200),
    fecha: FechaSchema,
  })
  .refine((datos) => (CATEGORIAS[datos.tipo] as readonly string[]).includes(datos.categoria), {
    message: "La categoría no corresponde al tipo de movimiento.",
    path: ["categoria"],
  })
  // Después del refine la categoría ya es una de la lista: se lo dice al tipo.
  .transform((datos) => datos as typeof datos & { categoria: Categoria });

export type DatosDeMovimiento = z.infer<typeof DatosDeMovimientoSchema>;

/** La cotización con la que se pasó a pesos un movimiento en dólares. */
export type CotizacionUsada = { tipoDeDolar: TipoDeDolar; valor: number };

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
    if (cotizacion) throw new Error("Un movimiento en pesos no lleva cotización.");
    return datos.monto;
  }
  if (!cotizacion) throw new Error("Un movimiento en dólares necesita la cotización con la que se pasa a pesos.");
  // Centavos × diezmilésimos (la cotización se guarda con 4 decimales) = centavos × 10.000, redondeado.
  const centavos = BigInt(Math.round(datos.monto * 100));
  const diezmilesimos = BigInt(Math.round(cotizacion.valor * 10_000));
  const producto = centavos * diezmilesimos;
  const centavosEnPesos = (producto + BigInt(5_000)) / BigInt(10_000);
  return Number(centavosEnPesos) / 100;
}

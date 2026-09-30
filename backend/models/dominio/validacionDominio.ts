import { z } from "zod";
import { redondear } from "./dinero";
import { lanzarMovimientoInvalido } from "./erroresDominio";
import { CATEGORIAS, MEDIOS_DE_PAGO, MONEDAS, TIPOS_DE_MOVIMIENTO, TODAS_LAS_CATEGORIAS } from "./movimiento";

// Todas las validaciones con Zod de backend/models/dominio: qué datos puede tener un movimiento. Los demás archivos de
// esta carpeta no importan zod: llaman a estos esquemas.

/**
 * Un día del calendario, "AAAA-MM-DD" (la fecha del movimiento según la persona, en hora de Argentina). Con un rango
 * razonable: el formato solo aceptaría también el año 0000, que la base rechaza.
 */
export const FechaSchema = z.iso
  .date("La fecha tiene que ser un día del calendario (AAAA-MM-DD).")
  .refine((fecha) => fecha >= "1900-01-01" && fecha <= "2100-12-31", "La fecha tiene que estar entre 1900 y 2100.");

/** El monto más grande que entra en la base (numeric(14,2)). */
const MONTO_MAXIMO = 999_999_999_999.99;

/** Plata: positiva y con a lo sumo dos decimales. */
const MontoSchema = z
  .number()
  .positive("El monto tiene que ser mayor que cero.")
  .max(MONTO_MAXIMO, "El monto es demasiado grande.")
  .refine((monto) => redondear(monto) === monto, "El monto puede tener a lo sumo dos decimales.");

/** Lo que describe la persona. El monto en pesos no: lo calcula la app con la cotización del día. */
export const DatosDeMovimientoSchema = z
  .object({
    tipo: z.enum(TIPOS_DE_MOVIMIENTO),
    monto: MontoSchema,
    moneda: z.enum(MONEDAS),
    categoria: z.enum(TODAS_LAS_CATEGORIAS, "La categoría no existe."),
    medioDePago: z.enum(MEDIOS_DE_PAGO),
    descripcion: z.string().trim().min(1, "La descripción está vacía.").max(200),
    fecha: FechaSchema,
  })
  .refine((datos) => CATEGORIAS[datos.tipo].some((categoria) => categoria === datos.categoria), {
    message: "La categoría no corresponde al tipo de movimiento.",
    path: ["categoria"],
  });

export type DatosDeMovimiento = z.infer<typeof DatosDeMovimientoSchema>;

/** Los datos de un movimiento ya validados, o el primer problema (con el texto que se le explica a la persona). */
export type DatosDeMovimientoLeidos = { ok: true; datos: DatosDeMovimiento } | { ok: false; detalle: string };

/** Valida los datos de un movimiento sin lanzar: para lo que llega del asistente y para las filas que se leen. */
export function leerDatosDeMovimiento(entrada: unknown): DatosDeMovimientoLeidos {
  const resultado = DatosDeMovimientoSchema.safeParse(entrada);
  if (resultado.success) return { ok: true, datos: resultado.data };
  return { ok: false, detalle: resultado.error.issues[0]?.message ?? "Los datos del movimiento no son válidos." };
}

/**
 * Los datos de un movimiento validados; si no son válidos, lanza ErrorDeDominio. Es para quien ya tendría que haberlos
 * validado antes (ej. el repositorio, antes de guardar): llegar acá con datos inválidos es un error de programación.
 */
export function validarDatosDeMovimiento(entrada: unknown): DatosDeMovimiento {
  const leidos = leerDatosDeMovimiento(entrada);
  return leidos.ok ? leidos.datos : lanzarMovimientoInvalido(leidos.detalle);
}

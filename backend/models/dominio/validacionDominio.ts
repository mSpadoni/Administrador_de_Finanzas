import { z } from "zod";
import { redondear } from "./dinero";
import { CATEGORIAS, MEDIOS_DE_PAGO, MONEDAS, TIPOS_DE_MOVIMIENTO, type Categoria } from "./movimiento";

// Todas las validaciones con Zod de backend/models/dominio: qué datos puede tener un movimiento. Los demás archivos de
// esta carpeta no importan zod: llaman a estos esquemas.

/** Un día del calendario, "AAAA-MM-DD" (la fecha del movimiento según la persona, en hora de Argentina). */
export const FechaSchema = z.iso.date("La fecha tiene que ser un día del calendario (AAAA-MM-DD).");

/** Plata: positiva y con a lo sumo dos decimales. */
const MontoSchema = z
  .number()
  .positive("El monto tiene que ser mayor que cero.")
  .refine((monto) => redondear(monto) === monto, "El monto puede tener a lo sumo dos decimales.");

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

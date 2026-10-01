import "server-only";
import { z } from "zod";
import {
  CATEGORIAS,
  MEDIOS_DE_PAGO,
  MONEDAS,
  TODAS_LAS_CATEGORIAS,
  TIPOS_DE_DOLAR,
  TIPOS_DE_MOVIMIENTO,
} from "@/backend/models/dominio/movimiento";
import { FechaSchema } from "@/backend/models/dominio/validacionDominio";

// Todo lo que el LLM le manda a una tool se valida acá, con Zod: son los `inputSchema` de cada tool. Las descripciones
// (`.describe`) son las que lee el modelo para decidir cómo llamarlas. Lo que se hace con esos datos (registrar,
// consultar, convertir) lo decide backend/controllers/movimientos.controller.ts.

const PeriodoSchema = z
  .object({
    unidad: z.enum(["dia", "semana", "mes"]).optional().describe("Día, semana (lunes a domingo) o mes calendario."),
    referencia: FechaSchema.optional().describe("Una fecha dentro del período (AAAA-MM-DD). Sin valor: hoy."),
    desde: FechaSchema.optional().describe("Rango explícito: primer día (AAAA-MM-DD). Tiene prioridad sobre unidad."),
    hasta: FechaSchema.optional().describe("Rango explícito: último día (AAAA-MM-DD). Sin valor: hoy."),
  })
  .optional()
  .describe(
    "Sin valor: el mes actual. Ej.: 'la semana pasada' = { unidad: 'semana', referencia: <un día de la semana pasada> }."
  );

export const EntradaRegistrarMovimientoSchema = z.object({
  tipo: z.enum(TIPOS_DE_MOVIMIENTO),
  monto: z.number().positive().describe("En la moneda indicada, hasta dos decimales."),
  moneda: z.enum(MONEDAS).describe("ARS (pesos) o USD (dólares)."),
  categoria: z
    .enum(TODAS_LAS_CATEGORIAS)
    .describe(
      `Gastos: ${CATEGORIAS.gasto.join(", ")}. Ingresos: ${CATEGORIAS.ingreso.join(", ")}. Solo si lo que compró la define sin dudas; si es ambigua (ej. "hot dogs"), preguntá. "otros" es solo para lo que no encaja en ninguna, no para salir del paso.`
    ),
  medioDePago: z
    .enum(MEDIOS_DE_PAGO)
    .describe("Nunca lo asumas: si la persona no lo dijo, preguntáselo antes de registrar."),
  descripcion: z.string().describe("Corta, en palabras de la persona (ej. 'Súper Coto', 'Sueldo de septiembre')."),
  fecha: FechaSchema.optional().describe("El día del movimiento (AAAA-MM-DD). Sin valor: hoy."),
  tipoDeDolar: z
    .enum(TIPOS_DE_DOLAR)
    .optional()
    .describe("Solo si es en dólares. Sin valor: oficial. Una compra con tarjeta en dólares: tarjeta."),
});

export const EntradaConsultarMovimientosSchema = z.object({
  periodo: PeriodoSchema,
  tipo: z.enum(TIPOS_DE_MOVIMIENTO).optional().describe("Solo gastos o solo ingresos."),
  categoria: z.enum(TODAS_LAS_CATEGORIAS).optional().describe("Solo esa categoría."),
});

export const EntradaEstadisticasSchema = z.object({ periodo: PeriodoSchema });

export const EntradaBorrarMovimientoSchema = z.object({ id: z.uuid().describe("El id del movimiento.") });

export const EntradaConvertirSchema = z.object({
  monto: z.number().positive(),
  de: z.enum(MONEDAS).describe("La moneda del monto: se convierte a la otra."),
  tipoDeDolar: z.enum(TIPOS_DE_DOLAR).optional().describe("Sin valor: oficial."),
});

export const EntradaCotizacionDolarSchema = z.object({
  tipoDeDolar: z.enum(TIPOS_DE_DOLAR).optional().describe("Solo ese tipo de dólar. Sin valor: todos."),
});

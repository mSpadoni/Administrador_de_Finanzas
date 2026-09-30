import "server-only";
import { tool } from "ai";
import { movimientosController, type MovimientosController } from "@/backend/controllers/movimientos.controller";
import { ejecutarSinLanzar } from "./ejecutarSinLanzar";
import { EntradaEstadisticasSchema } from "./validacionTools";

/** La tool estadisticas: totales, porcentajes por categoría y variación contra el período anterior. */
export function crearToolEstadisticas(movimientos: MovimientosController = movimientosController) {
  return tool({
    description:
      "Estadísticas de un período: ingresos, gastos, balance, totales y porcentaje por categoría, promedio diario " +
      "de gastos y cuánto variaron los gastos contra el período anterior. Usala para '¿cómo vengo?', '¿en qué " +
      "gasto más?' o comparaciones.",
    inputSchema: EntradaEstadisticasSchema,
    execute: ejecutarSinLanzar("estadisticas", ({ periodo }) => movimientos.estadisticas(periodo)),
  });
}

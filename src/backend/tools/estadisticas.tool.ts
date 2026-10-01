import "server-only";
import { tool } from "ai";
import { movimientosServicio, type MovimientosServicio } from "@/backend/servicios/movimientos.servicio";
import { ejecutarSinLanzar } from "./ejecutarSinLanzar";
import { EntradaEstadisticasSchema } from "./validacionTools";

/** La tool estadisticas: totales, porcentajes por categoría y variación contra el período anterior. */
export function crearToolEstadisticas(movimientos: MovimientosServicio = movimientosServicio) {
  return tool({
    description:
      "Estadísticas de un período: ingresos, gastos, balance, totales y porcentaje por categoría, promedio diario " +
      "de gastos y cuánto variaron los gastos contra el período anterior. Usala para '¿cómo vengo?', '¿en qué " +
      "gasto más?' o comparaciones.",
    inputSchema: EntradaEstadisticasSchema,
    execute: ejecutarSinLanzar("estadisticas", ({ periodo }) => movimientos.estadisticas(periodo)),
  });
}

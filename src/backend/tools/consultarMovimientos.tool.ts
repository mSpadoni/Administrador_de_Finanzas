import "server-only";
import { tool } from "ai";
import { movimientosController, type MovimientosController } from "@/backend/controllers/movimientos.controller";
import { ejecutarSinLanzar } from "./ejecutarSinLanzar";
import { EntradaConsultarMovimientosSchema } from "./validacionTools";

/** La tool consultar_movimientos: los movimientos de la persona en un período, con ingresos, gastos y balance. */
export function crearToolConsultarMovimientos(movimientos: MovimientosController = movimientosController) {
  return tool({
    description:
      "Los movimientos de la persona en un período (el más reciente primero), con ingresos, gastos y balance. Usala " +
      "para listar o sumar lo que registró, y para encontrar el id de uno que quiera borrar.",
    inputSchema: EntradaConsultarMovimientosSchema,
    execute: ejecutarSinLanzar("consultar_movimientos", (consulta) => movimientos.consultar(consulta)),
  });
}

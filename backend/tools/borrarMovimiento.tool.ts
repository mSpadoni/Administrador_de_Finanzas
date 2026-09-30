import "server-only";
import { tool } from "ai";
import { movimientosController, type MovimientosController } from "@/backend/controllers/movimientos.controller";
import { EntradaBorrarMovimientoSchema } from "./validacionTools";

/** La tool borrar_movimiento: borra un movimiento de la persona por su id, después de confirmarlo con ella. */
export function crearToolBorrarMovimiento(movimientos: MovimientosController = movimientosController) {
  return tool({
    description:
      "Borra un movimiento de la persona por su id (sacalo de consultar_movimientos). Antes de borrar, confirmá " +
      "con la persona cuál es (descripción, monto y fecha).",
    inputSchema: EntradaBorrarMovimientoSchema,
    execute: ({ id }) => movimientos.borrar(id),
  });
}

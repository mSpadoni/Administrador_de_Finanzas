import "server-only";
import { tool } from "ai";
import { movimientosServicio, type MovimientosServicio } from "@/backend/servicios/movimientos.servicio";
import { ejecutarSinLanzar } from "./ejecutarSinLanzar";
import { EntradaBorrarMovimientoSchema } from "./validacionTools";

/** La tool borrar_movimiento: borra un movimiento de la persona por su id, después de confirmarlo con ella. */
export function crearToolBorrarMovimiento(movimientos: MovimientosServicio = movimientosServicio) {
  return tool({
    description:
      "Borra un movimiento de la persona por su id (sacalo de consultar_movimientos). Antes de borrar, confirmá " +
      "con la persona cuál es (descripción, monto y fecha).",
    inputSchema: EntradaBorrarMovimientoSchema,
    execute: ejecutarSinLanzar("borrar_movimiento", ({ id }) => movimientos.borrar(id)),
  });
}

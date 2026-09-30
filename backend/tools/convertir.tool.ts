import "server-only";
import { tool } from "ai";
import { movimientosController, type MovimientosController } from "@/backend/controllers/movimientos.controller";
import { EntradaConvertirSchema } from "./validacionTools";

/** La tool convertir: pasa un monto entre pesos y dólares con la cotización actual. */
export function crearToolConvertir(movimientos: MovimientosController = movimientosController) {
  return tool({
    description:
      "Convierte un monto entre pesos y dólares con la cotización actual (compra y venta). Usala para '¿cuánto son " +
      "100 dólares?' o '¿cuántos dólares compro con 500.000 pesos?'. No calcules conversiones vos.",
    inputSchema: EntradaConvertirSchema,
    execute: ({ monto, de, tipoDeDolar }) => movimientos.convertir(monto, de, tipoDeDolar),
  });
}

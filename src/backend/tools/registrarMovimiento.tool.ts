import "server-only";
import { tool } from "ai";
import { movimientosServicio, type MovimientosServicio } from "@/backend/servicios/movimientos.servicio";
import { ejecutarSinLanzar } from "./ejecutarSinLanzar";
import { EntradaRegistrarMovimientoSchema } from "./validacionTools";

/** La tool registrar_movimiento: el asistente guarda un gasto o un ingreso de la persona. */
export function crearToolRegistrarMovimiento(movimientos: MovimientosServicio = movimientosServicio) {
  return tool({
    description:
      "Registra un gasto o un ingreso de la persona. Usala cuando cuente algo que gastó o cobró. Si es en dólares, " +
      "la herramienta busca la cotización del día y guarda también el monto en pesos (no la calcules vos). Una " +
      "compra en cuotas es un solo gasto por el total. Si falta un dato que la persona no dijo (el monto, si fue " +
      "gasto o ingreso, el medio de pago, o la categoría cuando es ambigua), preguntalo antes de registrar: no lo asumas.",
    inputSchema: EntradaRegistrarMovimientoSchema,
    execute: ejecutarSinLanzar("registrar_movimiento", (entrada) => movimientos.registrar(entrada)),
  });
}

import "server-only";
import { tool } from "ai";
import { movimientosController, type MovimientosController } from "@/backend/controllers/movimientos.controller";
import {
  EntradaBorrarMovimientoSchema,
  EntradaConsultarMovimientosSchema,
  EntradaConvertirSchema,
  EntradaEstadisticasSchema,
  EntradaRegistrarMovimientoSchema,
} from "./validacionTools";

// Las tools con las que el asistente registra y consulta los movimientos de la persona. Solo describen cuándo usar
// cada una y le pasan lo que mandó el modelo al MovimientosController, que decide qué hacer: las tools no conocen los
// modelos ni la base. Los números salen siempre de la base o de dolarapi, nunca del modelo de lenguaje.

/** Lo que necesitan las tools de movimientos: el controller que ejecuta cada caso de uso (los tests le pasan uno propio). */
export type DependenciasDeMovimientos = {
  movimientos?: MovimientosController;
};

/** Las tools de movimientos y la de convertir entre pesos y dólares. Sin dependencias, usa las de la app. */
export function crearToolsMovimientos({ movimientos = movimientosController }: DependenciasDeMovimientos = {}) {
  return {
    registrar_movimiento: tool({
      description:
        "Registra un gasto o un ingreso de la persona. Usala cuando cuente algo que gastó o cobró. Si es en dólares, " +
        "la herramienta busca la cotización del día y guarda también el monto en pesos (no la calcules vos). Una " +
        "compra en cuotas es un solo gasto por el total. Si falta un dato que la persona no dijo (el monto, si fue " +
        "gasto o ingreso, el medio de pago, o la categoría cuando es ambigua), preguntalo antes de registrar: no lo asumas.",
      inputSchema: EntradaRegistrarMovimientoSchema,
      execute: (entrada) => movimientos.registrar(entrada),
    }),

    consultar_movimientos: tool({
      description:
        "Los movimientos de la persona en un período (el más reciente primero), con ingresos, gastos y balance. Usala " +
        "para listar o sumar lo que registró, y para encontrar el id de uno que quiera borrar.",
      inputSchema: EntradaConsultarMovimientosSchema,
      execute: (consulta) => movimientos.consultar(consulta),
    }),

    estadisticas: tool({
      description:
        "Estadísticas de un período: ingresos, gastos, balance, totales y porcentaje por categoría, promedio diario " +
        "de gastos y cuánto variaron los gastos contra el período anterior. Usala para '¿cómo vengo?', '¿en qué " +
        "gasto más?' o comparaciones.",
      inputSchema: EntradaEstadisticasSchema,
      execute: ({ periodo }) => movimientos.estadisticas(periodo),
    }),

    borrar_movimiento: tool({
      description:
        "Borra un movimiento de la persona por su id (sacalo de consultar_movimientos). Antes de borrar, confirmá " +
        "con la persona cuál es (descripción, monto y fecha).",
      inputSchema: EntradaBorrarMovimientoSchema,
      execute: ({ id }) => movimientos.borrar(id),
    }),

    convertir: tool({
      description:
        "Convierte un monto entre pesos y dólares con la cotización actual (compra y venta). Usala para '¿cuánto son " +
        "100 dólares?' o '¿cuántos dólares compro con 500.000 pesos?'. No calcules conversiones vos.",
      inputSchema: EntradaConvertirSchema,
      execute: ({ monto, de, tipoDeDolar }) => movimientos.convertir(monto, de, tipoDeDolar),
    }),
  };
}

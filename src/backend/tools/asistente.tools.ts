import "server-only";
import type { CotizacionesServicio } from "@/backend/servicios/cotizaciones.servicio";
import type { MovimientosServicio } from "@/backend/servicios/movimientos.servicio";
import { crearToolBorrarMovimiento } from "./borrarMovimiento.tool";
import { crearToolConsultarMovimientos } from "./consultarMovimientos.tool";
import { crearToolConvertir } from "./convertir.tool";
import { crearToolCotizacionDolar } from "./cotizacionDolar.tool";
import { crearToolEstadisticas } from "./estadisticas.tool";
import { crearToolRegistrarMovimiento } from "./registrarMovimiento.tool";

/** Lo que se le puede pasar a las tools del asistente para reemplazar sus piezas (útil en los tests). */
type DependenciasDelAsistente = {
  /** El servicio que ejecutan las tools de movimientos y de convertir (con la sesión del pedido). */
  movimientos?: MovimientosServicio;
  /** El servicio que ejecuta la tool de la cotización del dólar. */
  cotizaciones?: CotizacionesServicio;
};

/**
 * Todas las tools del asistente, en un solo lugar: cada una vive en su archivo (`<nombre>.tool.ts`) y acá se registran con
 * el nombre con el que las llama el modelo. De acá sale también el tipo de los mensajes que ve el navegador
 * (shared/chat.ts): si una tool cambia de nombre, de datos o de resultado, la vista deja de compilar.
 * Sin dependencias usa las de la app (los servicios de movimientos y de cotizaciones).
 */
export function crearToolsAsistente({ movimientos, cotizaciones }: DependenciasDelAsistente = {}) {
  return {
    registrar_movimiento: crearToolRegistrarMovimiento(movimientos),
    consultar_movimientos: crearToolConsultarMovimientos(movimientos),
    estadisticas: crearToolEstadisticas(movimientos),
    borrar_movimiento: crearToolBorrarMovimiento(movimientos),
    convertir: crearToolConvertir(movimientos),
    cotizacion_dolar: crearToolCotizacionDolar(cotizaciones),
  };
}

/** El tipo del conjunto de tools del asistente (para derivar el tipo de los mensajes). */
export type ToolsDelAsistente = ReturnType<typeof crearToolsAsistente>;

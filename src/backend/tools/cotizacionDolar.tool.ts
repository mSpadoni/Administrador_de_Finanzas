import "server-only";
import { tool } from "ai";
import { cotizacionesServicio, type CotizacionesServicio } from "@/backend/servicios/cotizaciones.servicio";
import { ejecutarSinLanzar } from "./ejecutarSinLanzar";
import { EntradaCotizacionDolarSchema } from "./validacionTools";

/** La tool cotizacion_dolar: la cotización actual del dólar (todos los tipos o uno). */
export function crearToolCotizacionDolar(cotizaciones: CotizacionesServicio = cotizacionesServicio) {
  return tool({
    description:
      "Cotización actual del dólar en Argentina (oficial, blue, MEP y tarjeta), con compra y venta en pesos. Usala " +
      "cuando pregunten por el dólar. Nunca digas una cotización sin haberla pedido con esta herramienta.",
    inputSchema: EntradaCotizacionDolarSchema,
    execute: ejecutarSinLanzar("cotizacion_dolar", ({ tipoDeDolar }) => cotizaciones.cotizaciones(tipoDeDolar)),
  });
}

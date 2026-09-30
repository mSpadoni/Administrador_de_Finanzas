import "server-only";
import { tool } from "ai";
import { clienteDolar, type ClienteDolar, type ResultadoCotizaciones } from "@/backend/lib/dolar";
import { EntradaCotizacionDolarSchema } from "./validacionTools";

/** La tool cotizacion_dolar. `dolar` permite probar con otro servidor. */
export function crearToolsDolar(dolar: ClienteDolar = clienteDolar) {
  return {
    cotizacion_dolar: tool({
      description:
        "Cotización actual del dólar en Argentina (oficial, blue, MEP y tarjeta), con compra y venta en pesos. Usala " +
        "cuando pregunten por el dólar. Nunca digas una cotización sin haberla pedido con esta herramienta.",
      inputSchema: EntradaCotizacionDolarSchema,
      execute: async ({ tipoDeDolar }): Promise<ResultadoCotizaciones> => {
        const resultado = await dolar.cotizaciones();
        if (!resultado.ok || !tipoDeDolar) return resultado;
        return { ok: true, cotizaciones: resultado.cotizaciones.filter((c) => c.tipoDeDolar === tipoDeDolar) };
      },
    }),
  };
}

import "server-only";
import { clienteDolar, type ClienteDolar } from "@/backend/lib/dolar/clienteDolar";
import type { ResultadoCotizaciones } from "@/backend/lib/dolar/cotizaciones";
import type { TipoDeDolar } from "@/backend/models/dominio/movimiento";

/**
 * Caso de uso de las cotizaciones del dólar: las de todos los tipos o las de uno solo. Las tools no hablan con el cliente
 * de dolarapi.com: le piden las cosas a este controller, igual que con los movimientos. Nunca lanza: devuelve las
 * cotizaciones o por qué no se pudieron obtener.
 */
export class CotizacionesController {
  constructor(private readonly dolar: ClienteDolar = clienteDolar) {}

  /** Las cotizaciones (compra y venta) de todos los tipos de dólar, o solo las de `tipoDeDolar`. */
  async cotizaciones(tipoDeDolar?: TipoDeDolar): Promise<ResultadoCotizaciones> {
    const resultado = await this.dolar.cotizaciones();
    if (!resultado.ok || !tipoDeDolar) return resultado;
    return { ok: true, cotizaciones: resultado.cotizaciones.filter((c) => c.tipoDeDolar === tipoDeDolar) };
  }
}

/** Instancia lista para usar desde las tools (con el cliente de dolarapi.com de la app). */
export const cotizacionesController = new CotizacionesController();

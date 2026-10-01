import type { ResultadoExitoso } from "@/shared/chat";
import { formatoMonto, horaDeActualizacion, nombreDelTipoDeDolar } from "../../compartidos/formato";
import { tarjeta } from "./estilos";

/** Lo que da una conversión de pesos a dólares (o al revés) con la cotización del día. */
export function TarjetaDeConversion({ conversion }: { conversion: ResultadoExitoso<"convertir"> }) {
  const { monto, de, a, tipoDeDolar, conCompra, conVenta, actualizada } = conversion;
  return (
    <section aria-label="Conversión" className={tarjeta}>
      <p className="font-semibold">
        {formatoMonto(monto, de)} en dólar {nombreDelTipoDeDolar(tipoDeDolar).toLowerCase()}
      </p>
      <p className="mt-1">
        Con la cotización de compra: {formatoMonto(conCompra, a)} · con la de venta: {formatoMonto(conVenta, a)}
      </p>
      <p className="mt-1 text-xs text-tinta-suave">
        Cotización actualizada el {horaDeActualizacion(actualizada)} · Fuente: dolarapi.com
      </p>
    </section>
  );
}

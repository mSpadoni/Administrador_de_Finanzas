import type { ResultadoExitoso } from "@/shared/chat";
import { formatoPesos, horaDeActualizacion, nombreDelTipoDeDolar } from "../../../compartidos/formato";
import { tarjeta } from "../estilos";

/** La cotización de cada tipo de dólar pedido: compra, venta y cuándo se actualizó. */
export function TarjetaDeCotizacion({
  cotizaciones,
}: {
  cotizaciones: ResultadoExitoso<"cotizacion_dolar">["cotizaciones"];
}) {
  if (cotizaciones.length === 0) return null;
  return (
    <section aria-label="Cotización del dólar" className={tarjeta}>
      <ul className="space-y-2">
        {cotizaciones.map((c) => (
          <li key={c.tipoDeDolar} className="flex flex-wrap items-baseline justify-between gap-x-4">
            <span className="font-semibold">Dólar {nombreDelTipoDeDolar(c.tipoDeDolar).toLowerCase()}</span>
            <span>
              Compra {formatoPesos(c.compra)} · Venta {formatoPesos(c.venta)}
            </span>
            <span className="w-full text-xs text-tinta-suave">Actualizada el {horaDeActualizacion(c.actualizada)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-tinta-suave">Fuente: dolarapi.com</p>
    </section>
  );
}

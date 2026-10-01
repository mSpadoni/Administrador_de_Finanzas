import type { ResultadoExitoso } from "@/shared/chat";
import { fechaCorta, formatoMonto, formatoPesos, nombreDeCategoria } from "../../compartidos/formato";
import { tarjeta } from "./estilos";
import ResumenDeMontos from "./ResumenDeMontos";

/** Máximo de filas que muestra la tabla en el chat; el resto se avisa (el detalle completo lo cuenta el asistente). */
export const MAX_FILAS_EN_TABLA = 15;

/** Los movimientos de un período en una tabla, con el resumen de ingresos, gastos y balance. */
export function TablaDeMovimientos({ datos }: { datos: ResultadoExitoso<"consultar_movimientos"> }) {
  const { periodo, movimientos, resumen } = datos;
  const visibles = movimientos.slice(0, MAX_FILAS_EN_TABLA);
  const titulo = `Movimientos del ${fechaCorta(periodo.desde)} al ${fechaCorta(periodo.hasta)}`;
  return (
    <section aria-label={titulo} className={tarjeta}>
      {movimientos.length === 0 ? (
        <p>{titulo}: no hay movimientos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <caption className="pb-2 text-left font-semibold">{titulo}</caption>
            <thead>
              <tr className="border-b border-borde-fuerte">
                <th scope="col" className="py-1 pr-2 font-semibold">
                  Fecha
                </th>
                <th scope="col" className="py-1 pr-2 font-semibold">
                  Descripción
                </th>
                <th scope="col" className="py-1 pr-2 font-semibold">
                  Categoría
                </th>
                <th scope="col" className="py-1 text-right font-semibold">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((m) => (
                <tr key={m.id} className="border-b border-borde last:border-0">
                  <td className="py-1 pr-2 whitespace-nowrap">{fechaCorta(m.fecha)}</td>
                  <td className="py-1 pr-2">{m.descripcion}</td>
                  <td className="py-1 pr-2">{nombreDeCategoria(m.categoria)}</td>
                  <td className="py-1 text-right whitespace-nowrap tabular-nums">
                    <span className="sr-only">{m.tipo === "gasto" ? "Gasto de " : "Ingreso de "}</span>
                    <span aria-hidden="true">{m.tipo === "gasto" ? "− " : "+ "}</span>
                    {formatoPesos(m.montoEnPesos)}
                    {m.moneda === "USD" && (
                      <span className="block text-xs text-tinta-suave">{formatoMonto(m.monto, "USD")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {movimientos.length > visibles.length && (
        <p className="mt-1 text-xs text-tinta-suave">Y {movimientos.length - visibles.length} más en este período.</p>
      )}
      <ResumenDeMontos resumen={resumen} />
    </section>
  );
}

import type { EstadisticasDelPeriodo } from "@/shared/chat";
import { formatoPesos, formatoPorcentaje, nombreDeCategoria } from "../../compartidos/formato";

/** Las barras de los gastos por categoría: el ancho es el porcentaje, y el número va siempre escrito al lado. */
export function BarrasDeCategorias({ porCategoria }: { porCategoria: EstadisticasDelPeriodo["porCategoria"] }) {
  const gastos = porCategoria.filter((c) => c.tipo === "gasto");
  if (gastos.length === 0) return <p className="mt-2 text-xs text-tinta-suave">No hubo gastos en este período.</p>;
  return (
    <ul aria-label="Gastos por categoría" className="mt-2 space-y-2">
      {gastos.map((c) => (
        <li key={c.categoria}>
          <p className="flex justify-between gap-2 text-xs sm:text-sm">
            <span>{nombreDeCategoria(c.categoria)}</span>
            <span className="whitespace-nowrap">
              {formatoPesos(c.total)} · {formatoPorcentaje(c.porcentaje)}
            </span>
          </p>
          {/* La barra es solo un refuerzo visual: la información está en el texto de arriba. */}
          <div aria-hidden="true" className="mt-0.5 h-2 rounded-full bg-superficie-fuerte">
            <div
              className="h-2 rounded-full bg-marca"
              style={{ width: `${Math.min(100, Math.max(2, c.porcentaje))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

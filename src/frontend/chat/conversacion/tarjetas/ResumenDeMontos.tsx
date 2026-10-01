import type { EstadisticasDelPeriodo } from "@/shared/chat";
import { formatoPesos } from "../../compartidos/formato";

/** Ingresos, gastos y balance (en pesos). */
export default function ResumenDeMontos({ resumen }: { resumen: EstadisticasDelPeriodo["resumen"] }) {
  return (
    <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-borde pt-2 text-xs sm:text-sm">
      <div>
        <dt className="text-tinta-suave">Ingresos</dt>
        <dd className="font-semibold text-ingreso">{formatoPesos(resumen.ingresos)}</dd>
      </div>
      <div>
        <dt className="text-tinta-suave">Gastos</dt>
        <dd className="font-semibold text-peligro">{formatoPesos(resumen.gastos)}</dd>
      </div>
      <div>
        <dt className="text-tinta-suave">Balance</dt>
        <dd className="font-semibold">{formatoPesos(resumen.balance)}</dd>
      </div>
    </dl>
  );
}

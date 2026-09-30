import type { EstadisticasDelPeriodo } from "@/shared/chat";
import { formatoPesos, formatoPorcentaje, nombreDeCategoria, nombreDelMes, textoDeVariacion } from "./formato";

/** Cuántas categorías de gasto muestra el panel. */
export const CATEGORIAS_EN_EL_PANEL = 4;

type Props = {
  /** Las estadísticas del mes en curso, o null si no se pudieron leer. */
  estadisticas: EstadisticasDelPeriodo | null;
};

/** El contenido del panel: total del mes y las categorías donde más se gastó. Lo usa el panel fijo y el cajón del celular. */
export function ContenidoDelMes({ estadisticas }: Props) {
  if (!estadisticas) {
    return <p className="text-sm text-slate-700">No pudimos cargar el resumen del mes. Probá recargar la página.</p>;
  }
  const { periodo, resumen, porCategoria, variacionDeGastos } = estadisticas;
  const top = porCategoria.filter((c) => c.tipo === "gasto").slice(0, CATEGORIAS_EN_EL_PANEL);
  return (
    <>
      <p className="text-xs text-slate-700 capitalize">{nombreDelMes(periodo.desde)}</p>
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt>Ingresos</dt>
          <dd className="font-semibold text-green-800 tabular-nums">{formatoPesos(resumen.ingresos)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Gastos</dt>
          <dd className="font-semibold text-red-800 tabular-nums">{formatoPesos(resumen.gastos)}</dd>
        </div>
        <div className="flex justify-between gap-2 border-t border-slate-200 pt-1">
          <dt>Balance</dt>
          <dd className="font-semibold tabular-nums">{formatoPesos(resumen.balance)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-slate-700">{textoDeVariacion(variacionDeGastos.porcentaje)}</p>
      {top.length === 0 ? (
        <p className="mt-3 text-sm text-slate-700">Todavía no registraste gastos este mes.</p>
      ) : (
        <>
          <h3 className="mt-3 text-xs font-semibold text-slate-800">Donde más gastás</h3>
          <ul className="mt-1 space-y-1.5">
            {top.map((c) => (
              <li key={c.categoria}>
                <p className="flex justify-between gap-2 text-xs">
                  <span>{nombreDeCategoria(c.categoria)}</span>
                  <span className="whitespace-nowrap">
                    {formatoPesos(c.total)} · {formatoPorcentaje(c.porcentaje)}
                  </span>
                </p>
                <div aria-hidden="true" className="mt-0.5 h-1.5 rounded-full bg-slate-200">
                  <div
                    className="h-1.5 rounded-full bg-blue-700"
                    style={{ width: `${Math.min(100, Math.max(2, c.porcentaje))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/**
 * «Este mes»: el resumen a mano mientras se conversa, fijo a la derecha en pantallas grandes (en las chicas se abre desde el
 * encabezado, ver CajonDelBalance). Es un Server Component (los datos los lee la página). Se actualiza cuando el asistente registra o borra un movimiento: el chat le pide a
 * Next que vuelva a leer la página.
 */
export default function PanelDelMes({ estadisticas }: Props) {
  return (
    <aside
      aria-labelledby="titulo-este-mes"
      className="hidden w-64 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4 lg:block"
    >
      <h2 id="titulo-este-mes" className="mb-1 text-sm font-semibold text-slate-900">
        Este mes
      </h2>
      <ContenidoDelMes estadisticas={estadisticas} />
    </aside>
  );
}

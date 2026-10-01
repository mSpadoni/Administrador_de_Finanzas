import type { EstadisticasDelPeriodo } from "@/shared/chat";
import { AvisoDeActualizacion, ResumenNoDisponible } from "./EstadoDelResumen";
import {
  formatoPesos,
  formatoPorcentaje,
  nombreDeCategoria,
  nombreDelMes,
  textoDeVariacion,
} from "../compartidos/formato";

/** Cuántas categorías de gasto muestra el panel. */
export const CATEGORIAS_EN_EL_PANEL = 4;

type Props = {
  /** Las estadísticas del mes en curso, o null si no se pudieron leer. */
  estadisticas: EstadisticasDelPeriodo | null;
};

/** El contenido del panel: total del mes y las categorías donde más se gastó. Lo usa el panel fijo y el cajón del celular. */
export function ContenidoDelMes({ estadisticas }: Props) {
  if (!estadisticas) return <ResumenNoDisponible />;
  const { periodo, resumen, porCategoria, variacionDeGastos } = estadisticas;
  const top = porCategoria.filter((c) => c.tipo === "gasto").slice(0, CATEGORIAS_EN_EL_PANEL);
  return (
    <>
      <p className="text-xs text-tinta-suave first-letter:uppercase">{nombreDelMes(periodo.desde)}</p>
      <AvisoDeActualizacion />
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt>Ingresos</dt>
          <dd className="font-semibold text-ingreso tabular-nums">{formatoPesos(resumen.ingresos)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Gastos</dt>
          <dd className="font-semibold text-peligro tabular-nums">{formatoPesos(resumen.gastos)}</dd>
        </div>
        <div className="flex justify-between gap-2 border-t border-borde pt-1">
          <dt>Balance</dt>
          <dd className="font-semibold tabular-nums">{formatoPesos(resumen.balance)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-tinta-suave">{textoDeVariacion(variacionDeGastos.porcentaje)}</p>
      {top.length === 0 ? (
        <p className="mt-3 text-sm text-tinta-suave">
          Todavía no registraste gastos este mes. Contale al asistente el primero (por ejemplo: «gasté 5.000 en el súper
          con débito»).
        </p>
      ) : (
        <>
          <h3 className="mt-3 text-xs font-semibold text-tinta">Donde más gastás</h3>
          <ul className="mt-1 space-y-1.5">
            {top.map((c) => (
              <li key={c.categoria}>
                <p className="flex justify-between gap-2 text-xs">
                  <span>{nombreDeCategoria(c.categoria)}</span>
                  <span className="whitespace-nowrap">
                    {formatoPesos(c.total)} · {formatoPorcentaje(c.porcentaje)}
                  </span>
                </p>
                <div aria-hidden="true" className="mt-0.5 h-1.5 rounded-full bg-superficie-fuerte">
                  <div
                    className="h-1.5 rounded-full bg-marca"
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
      className="hidden w-64 shrink-0 overflow-y-auto border-l border-borde bg-superficie p-4 lg:block"
    >
      <h2 id="titulo-este-mes" className="mb-1 text-sm font-semibold text-tinta">
        Este mes
      </h2>
      <ContenidoDelMes estadisticas={estadisticas} />
    </aside>
  );
}

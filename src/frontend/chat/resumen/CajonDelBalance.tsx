"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { EstadisticasDelPeriodo } from "@/shared/chat";
import { usePaneles } from "../estado/ContextoDePaneles";
import Icono from "../compartidos/iconos";
import { ContenidoDelMes } from "./PanelDelMes";

type Props = {
  /** Las estadísticas del mes en curso, o null si no se pudieron leer. */
  estadisticas: EstadisticasDelPeriodo | null;
  onCerrar: () => void;
};

function Cajon({ estadisticas, onCerrar }: Props) {
  const cerrarRef = useRef<HTMLButtonElement>(null);

  // Al abrir, el foco va al botón de cerrar; al cerrar, vuelve al botón del encabezado que lo abrió.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    cerrarRef.current?.focus();
    return () => anterior?.focus();
  }, []);

  function alPresionarTecla(evento: KeyboardEvent<HTMLElement>) {
    if (evento.key === "Escape") onCerrar();
  }

  return (
    // lg:hidden: en pantallas grandes el balance ya está fijo a la derecha, este cajón no hace falta.
    <div className="lg:hidden">
      {/* Fondo oscuro detrás del cajón: tocarlo lo cierra. */}
      <div aria-hidden="true" onClick={onCerrar} className="fixed inset-0 z-20 bg-slate-900/40" />
      <aside
        id="panel-balance"
        aria-labelledby="titulo-balance"
        onKeyDown={alPresionarTecla}
        className="fixed inset-y-0 right-0 z-30 flex w-72 max-w-full flex-col bg-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-3">
          <h2 id="titulo-balance" className="text-base font-semibold text-slate-900">
            Este mes
          </h2>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar el balance del mes"
            className="grid size-11 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"
          >
            <Icono nombre="cerrar" className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ContenidoDelMes estadisticas={estadisticas} />
        </div>
      </aside>
    </div>
  );
}

/**
 * El balance del mes en celular y tablet: un cajón que sale desde la derecha (el mismo contenido del panel fijo de la
 * compu) cuando se toca el botón del encabezado. Cerrado no existe; se cierra con la ✕, tocando afuera o con Escape.
 */
export default function CajonDelBalance({ estadisticas }: { estadisticas: EstadisticasDelPeriodo | null }) {
  const { balanceAbierto, setBalanceAbierto } = usePaneles();
  return balanceAbierto ? <Cajon estadisticas={estadisticas} onCerrar={() => setBalanceAbierto(false)} /> : null;
}

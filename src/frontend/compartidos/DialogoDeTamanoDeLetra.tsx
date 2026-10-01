"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { LIMITES_DE_LETRA } from "./tamanoDeLetra";
import { useTamanoDeLetra } from "./useTamanoDeLetra";

type Props = { abierto: boolean; onCerrar: () => void };

/**
 * La ventanita para ajustar el tamaño de letra con una barra (de 85 % a 130 %). El cambio se ve en toda la página
 * mientras se mueve la barra; «Restablecer» vuelve al 100 % y «Listo», Escape o un click afuera la cierran (lo elegido
 * ya quedó aplicado y guardado). Patrón «dialog» de WAI-ARIA, como DialogoDeConfirmacion: al abrirse el foco va a la
 * barra, Tab no sale de la ventanita y al cerrarse el foco vuelve a donde estaba.
 */
export default function DialogoDeTamanoDeLetra({ abierto, onCerrar }: Props) {
  return abierto ? <ContenidoDelDialogo onCerrar={onCerrar} /> : null;
}

const BOTON = "h-11 rounded-full px-5 text-sm font-medium transition disabled:opacity-50";

function ContenidoDelDialogo({ onCerrar }: Pick<Props, "onCerrar">) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const [porcentaje, cambiar] = useTamanoDeLetra();
  const dialogoRef = useRef<HTMLDivElement>(null);
  const barraRef = useRef<HTMLInputElement>(null);
  const { minimo, normal, maximo, paso } = LIMITES_DE_LETRA;

  // Al abrir, el foco va a la barra (lo que se viene a usar); al cerrar, vuelve al elemento que lo tenía.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    barraRef.current?.focus();
    return () => anterior?.focus();
  }, []);

  function alPresionarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Escape") {
      evento.stopPropagation();
      onCerrar();
    }
    if (evento.key !== "Tab") return;
    // Tab y Shift+Tab dan la vuelta entre la barra y los botones: el foco no sale de la ventanita.
    const enfocables = [...(dialogoRef.current?.querySelectorAll<HTMLElement>("input, button:not(:disabled)") ?? [])];
    const primero = enfocables[0];
    const ultimo = enfocables.at(-1);
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo?.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero?.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overscroll-contain bg-slate-900/50 p-4"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
      onKeyDown={alPresionarTecla}
    >
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescripcion}
        className="w-full max-w-sm rounded-2xl bg-superficie p-6 shadow-2xl"
      >
        <h2 id={idTitulo} className="text-lg font-semibold text-tinta">
          Tamaño de letra
        </h2>
        <p id={idDescripcion} className="mt-2 text-sm text-tinta-suave">
          Mové la barra: toda la página se achica o se agranda. Queda guardado para la próxima vez.
        </p>

        <div className="mt-5 flex items-center gap-3">
          <span aria-hidden="true" className="text-xs font-semibold text-tinta-suave">
            A
          </span>
          <input
            ref={barraRef}
            type="range"
            min={minimo}
            max={maximo}
            step={paso}
            value={porcentaje}
            onChange={(evento) => cambiar(Number(evento.target.value))}
            aria-labelledby={idTitulo}
            aria-valuetext={`${porcentaje} %`}
            className="h-11 min-w-0 flex-1 cursor-pointer accent-marca"
          />
          <span aria-hidden="true" className="text-xl font-semibold text-tinta-suave">
            A
          </span>
          <output aria-hidden="true" className="w-14 text-right text-sm font-semibold text-tinta tabular-nums">
            {porcentaje} %
          </output>
        </div>

        <p className="mt-4 rounded-xl border border-borde bg-fondo p-3 text-tinta">
          Gasté 85.000 en el súper con débito
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => cambiar(normal)}
            disabled={porcentaje === normal}
            className={`${BOTON} border border-borde-fuerte text-tinta hover:bg-superficie-suave`}
          >
            Restablecer
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className={`${BOTON} bg-invertido text-sobre-invertido hover:bg-invertido-fuerte`}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

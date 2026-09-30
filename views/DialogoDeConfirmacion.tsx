"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";

type Props = {
  abierto: boolean;
  titulo: string;
  /** Qué va a pasar si confirma, en palabras de la persona. */
  descripcion: string;
  textoConfirmar: string;
  /** Lo que dice el botón de confirmar mientras se hace la acción. */
  textoPendiente?: string;
  /** Una acción destructiva (borrar): el botón de confirmar va en rojo. */
  peligro?: boolean;
  /** true mientras se hace la acción: los botones quedan deshabilitados y no se puede cerrar. */
  pendiente?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

/**
 * Pregunta de confirmación en el medio de la pantalla, sobre un fondo oscuro, para las acciones que no se pueden
 * deshacer (cerrar sesión, borrar una conversación). Reemplaza al `window.confirm` del navegador, que no se puede
 * estilar ni traducir. Sigue el patrón «dialog» de la guía WAI-ARIA: al abrirse el foco va al botón de cancelar (la
 * opción segura), Tab no sale del diálogo, Escape o un click afuera cancelan y al cerrarse el foco vuelve a donde estaba.
 */
export default function DialogoDeConfirmacion(props: Props) {
  // Los efectos (foco, teclado) viven en el contenido, que solo existe mientras el diálogo está abierto.
  return props.abierto ? <ContenidoDelDialogo {...props} /> : null;
}

function ContenidoDelDialogo({
  titulo,
  descripcion,
  textoConfirmar,
  textoPendiente,
  peligro = false,
  pendiente = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const confirmarRef = useRef<HTMLButtonElement>(null);

  // Al abrir, el foco va a «Cancelar»; al cerrar, vuelve al elemento que lo tenía (el botón que abrió el diálogo).
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    cancelarRef.current?.focus();
    return () => anterior?.focus();
  }, []);

  function alPresionarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Escape" && !pendiente) {
      evento.stopPropagation();
      onCancelar();
    }
    if (evento.key !== "Tab") return;
    // Tab y Shift+Tab dan la vuelta entre los dos botones: el foco no sale del diálogo.
    const primero = cancelarRef.current;
    const ultimo = confirmarRef.current;
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
        // Un click en el fondo (no en el cuadro) cancela.
        if (evento.target === evento.currentTarget && !pendiente) onCancelar();
      }}
      onKeyDown={alPresionarTecla}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescripcion}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id={idTitulo} className="text-lg font-semibold text-slate-900">
          {titulo}
        </h2>
        <p id={idDescripcion} className="mt-2 text-sm text-slate-700">
          {descripcion}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelarRef}
            type="button"
            onClick={onCancelar}
            disabled={pendiente}
            className="h-11 rounded-full border border-slate-300 px-5 text-sm font-medium text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            ref={confirmarRef}
            type="button"
            onClick={onConfirmar}
            disabled={pendiente}
            aria-busy={pendiente}
            className={`h-11 rounded-full px-5 text-sm font-medium text-white transition disabled:cursor-wait disabled:opacity-70 ${
              peligro ? "bg-red-700 hover:bg-red-800" : "bg-slate-900 hover:bg-slate-700"
            }`}
          >
            {pendiente && textoPendiente ? textoPendiente : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

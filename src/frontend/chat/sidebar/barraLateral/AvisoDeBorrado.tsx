"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { FONDO_DEL_MODAL } from "@/frontend/compartidos/useModal";
import Icono from "../../compartidos/iconos";
import type { ItemConversacion } from "../sidebar";

type Props = {
  /** La conversación recién borrada que todavía se puede recuperar (null: no hay aviso). */
  conversacion: ItemConversacion | null;
  onDeshacer: () => void;
  /** Cerrar el aviso con la ✕: el borrado se hace ya. */
  onCerrar: () => void;
  onPausar: () => void;
  onReanudar: () => void;
};

const sinSuscripcion = () => () => {};

/**
 * La carta «Borraste «…». Deshacer ✕» después de borrar una conversación. Va en un portal sobre toda la página (así se
 * ve aunque se cierre el cajón del celular), abajo y por arriba del campo de texto: a mano del pulgar en el celular.
 * La región está siempre montada (role="status") para que el lector de pantalla la anuncie apenas aparece; el foco va a
 * «Deshacer» porque el botón que se tocó (el del ítem) desaparece. Mientras el mouse está encima, o el foco llega con el
 * teclado (por ejemplo, a la ✕), el plazo se pausa: así nadie pierde la opción por estar leyendo.
 */
export default function AvisoDeBorrado({ conversacion, onDeshacer, onCerrar, onPausar, onReanudar }: Props) {
  const enElNavegador = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false
  );
  const deshacerRef = useRef<HTMLButtonElement>(null);
  // El foco que pone el propio aviso al aparecer no pausa el plazo (si no, nunca se iría solo): solo pausa cuando la
  // persona llega con el teclado.
  const focoDelAvisoRef = useRef(false);

  useEffect(() => {
    if (!conversacion) return;
    focoDelAvisoRef.current = true;
    deshacerRef.current?.focus();
    focoDelAvisoRef.current = false;
  }, [conversacion]);

  if (!enElNavegador) return null;
  return createPortal(
    // Sigue andando aunque el cajón del celular (un modal) deje inerte al resto de la página: se borra desde ahí.
    <div
      {...FONDO_DEL_MODAL}
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4 empty:hidden"
    >
      {conversacion && (
        <div
          onMouseEnter={onPausar}
          onMouseLeave={onReanudar}
          onFocus={() => {
            if (!focoDelAvisoRef.current) onPausar();
          }}
          onBlur={(evento) => {
            if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) onReanudar();
          }}
          className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-2xl border border-borde bg-superficie py-2 pr-2 pl-4 text-sm text-tinta shadow-xl motion-safe:animate-aparecer"
        >
          <p className="min-w-0 flex-1 truncate">Borraste «{conversacion.titulo}».</p>
          <button
            ref={deshacerRef}
            type="button"
            onClick={onDeshacer}
            className="h-11 shrink-0 rounded-full px-4 font-semibold text-enlace hover:bg-superficie-suave"
          >
            Deshacer
          </button>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar el aviso"
            className="grid size-11 shrink-0 place-items-center rounded-full text-tinta-suave hover:bg-superficie-suave"
          >
            <Icono nombre="cerrar" className="size-4" />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useSidebar } from "./EstadoSidebar";
import type { ItemConversacion } from "./sidebar";

type Props = {
  /** La conversación abierta ahora (se marca con aria-current). */
  actualId: string;
  /** Server action que borra una conversación del usuario. */
  borrar: (id: string) => Promise<void>;
};

/**
 * Lista de conversaciones del usuario (la más reciente arriba), con "Nueva conversación" y borrar .
 * La lista viene del estado compartido del sidebar (ver EstadoSidebar): se actualiza sin volver a consultar.
 * En escritorio queda fija al costado; en mobile es un Drawer detrás de un botón con texto (patrón de la clase 9).
 */
export default function SidebarConversaciones({ actualId, borrar }: Props) {
  const { conversaciones, quitarConversacion } = useSidebar();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false); // Solo importa en mobile.
  const [borrando, iniciarBorrado] = useTransition();
  const primerLinkRef = useRef<HTMLAnchorElement>(null);

  // Al abrir el Drawer, el foco va adentro; con Escape se cierra.
  useEffect(() => {
    if (!abierto) return;
    primerLinkRef.current?.focus();
    const alPresionarTecla = (evento: KeyboardEvent) => evento.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, [abierto]);

  /** Borrar es la única acción destructiva: pide confirmación (heurística #3). */
  function confirmarBorrado(conversacion: ItemConversacion) {
    if (!window.confirm(`¿Borrar la conversación «${conversacion.titulo}»? No se puede deshacer.`)) return;
    iniciarBorrado(async () => {
      await borrar(conversacion.id);
      // Si era la abierta, se pasa a una nueva; si no, se saca de la lista sin volver a consultar la base.
      if (conversacion.id === actualId) router.push("/");
      else quitarConversacion(conversacion.id);
    });
  }

  return (
    <>
      {/* Botón con texto (no solo un ícono) para abrir el Drawer en mobile. */}
      <div className="border-b border-slate-200 bg-white px-4 py-2 md:hidden">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-expanded={abierto}
          aria-controls="lista-conversaciones"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800"
        >
          <span aria-hidden="true">☰ </span>Conversaciones
        </button>
      </div>

      {/* Fondo oscuro detrás del Drawer en mobile: tocarlo lo cierra. */}
      {abierto && (
        <div
          aria-hidden="true"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-20 bg-slate-900/40 md:hidden"
        />
      )}

      <nav
        id="lista-conversaciones"
        aria-label="Conversaciones"
        className={`${
          abierto ? "fixed inset-y-0 left-0 z-30 flex w-72 shadow-xl" : "hidden"
        } flex-col border-r border-slate-200 bg-white md:static md:flex md:w-64 md:shadow-none`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-3">
          <Link
            ref={primerLinkRef}
            href="/"
            className="flex-1 rounded-lg bg-blue-700 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-800"
          >
            <span aria-hidden="true">+ </span>Nueva conversación
          </Link>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="Cerrar la lista de conversaciones"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <section aria-labelledby="titulo-conversaciones">
            <h2
              id="titulo-conversaciones"
              className="px-4 pt-3 text-xs font-semibold tracking-wide text-slate-600 uppercase"
            >
              Conversaciones
            </h2>
            {conversaciones.length === 0 ? (
              <p className="px-4 py-2 text-sm text-slate-600">Todavía no tenés conversaciones guardadas.</p>
            ) : (
              <ul className="space-y-1 p-2" aria-busy={borrando}>
                {conversaciones.map((conversacion) => {
                  const esLaActual = conversacion.id === actualId;
                  return (
                    <li key={conversacion.id} className="group flex items-center gap-1">
                      <Link
                        href={`/conversacion/${conversacion.id}`}
                        onClick={() => setAbierto(false)}
                        aria-current={esLaActual ? "page" : undefined}
                        className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-sm ${
                          esLaActual ? "bg-blue-50 font-medium text-blue-900" : "text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        {conversacion.titulo}
                      </Link>
                      <button
                        type="button"
                        onClick={() => confirmarBorrado(conversacion)}
                        disabled={borrando}
                        aria-label={`Borrar la conversación «${conversacion.titulo}»`}
                        className="rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
                      >
                        <span aria-hidden="true">🗑</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </nav>
    </>
  );
}

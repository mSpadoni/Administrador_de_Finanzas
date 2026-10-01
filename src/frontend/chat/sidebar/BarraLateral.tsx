"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import DialogoDeConfirmacion from "@/frontend/compartidos/DialogoDeConfirmacion";
import { FONDO_DEL_MODAL, useModal } from "@/frontend/compartidos/useModal";
import { useChatEnPantalla } from "../estado/ContextoDelChat";
import { usePaneles } from "../estado/ContextoDePaneles";
import { useSidebar } from "./EstadoSidebar";
import Icono from "../compartidos/iconos";
import { RUTAS, rutaDeConversacion } from "@/shared/rutas";
import { esClickComun } from "../compartidos/navegacion";
import PerfilDeUsuario from "./PerfilDeUsuario";
import { ATAJOS, type Atajo } from "../conversacion/respuesta";
import type { ItemConversacion } from "./sidebar";

type Props = {
  /** Server action que borra una conversación del usuario. */
  borrar: (id: string) => Promise<void>;
  /** Quién está logueado, para el perfil al pie. */
  usuario: { nombre: string; avatarUrl: string | null };
  /** Server action que cierra la sesión. */
  cerrarSesion: () => Promise<void>;
};

const ITEM = "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-tinta transition";

/** Lo que dura la animación con la que un ítem se pliega al borrarlo (ms). Es la misma duración de la clase `duration-300`. */
const DURACION_DE_SALIDA_MS = 300;

const esperar = (ms: number) => new Promise<void>((listo) => setTimeout(listo, ms));

/**
 * La barra lateral, de arriba abajo: «Nueva conversación», los atajos (las funciones de siempre a un toque), la lista de
 * conversaciones y, al pie, el perfil con el menú para cerrar sesión. La lista viene del estado compartido del sidebar
 * (ver EstadoSidebar): se actualiza sin volver a consultar.
 * En tablet y compu queda fija al costado; en celular es un Drawer que abre la hamburguesa del encabezado (patrón de la clase 9).
 */
export default function BarraLateral({ borrar, usuario, cerrarSesion }: Props) {
  const { conversaciones, quitarConversacion } = useSidebar();
  const { conversacionId, nuevaConversacion, abrirConversacion, usarAtajo, generando } = useChatEnPantalla();
  // En celular la hamburguesa del encabezado abre el menú; acá se cierra.
  const { abrirDebug, menuAbierto: abierto, setMenuAbierto: setAbierto } = usePaneles();
  const [porBorrar, setPorBorrar] = useState<ItemConversacion | null>(null);
  const [saliendo, setSaliendo] = useState<string | null>(null); // La conversación que se está plegando al borrarla.
  const [errorAlBorrar, setErrorAlBorrar] = useState<string | null>(null);
  const [borrando, iniciarBorrado] = useTransition();
  const primerLinkRef = useRef<HTMLAnchorElement>(null);
  const barraRef = useRef<HTMLElement>(null);
  // En celular, abierta es un cajón encima de todo: el resto de la página queda inerte (el foco no se escapa).
  useModal(barraRef, abierto);

  // Al abrir el Drawer, el foco va adentro; con Escape se cierra y el foco vuelve a la hamburguesa del encabezado.
  useEffect(() => {
    if (!abierto) return;
    primerLinkRef.current?.focus();
    const alPresionarTecla = (evento: KeyboardEvent) => evento.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alPresionarTecla);
    return () => {
      window.removeEventListener("keydown", alPresionarTecla);
      document.getElementById("boton-menu")?.focus();
    };
  }, [abierto, setAbierto]);

  function elegirAtajo(atajo: Atajo) {
    setAbierto(false);
    usarAtajo(atajo);
  }

  /**
   * Borrar es la única acción destructiva: pide confirmación (heurística #3) en un diálogo propio. Al confirmar, el ítem se
   * pliega y se desvanece mientras el servidor la borra; si era la abierta, se pasa a una conversación nueva. Si el servidor
   * falla, el ítem vuelve a aparecer y se avisa qué pasó (sin el aviso, parecería que se borró y volvió sola).
   */
  function borrarLaConversacion(conversacion: ItemConversacion) {
    setPorBorrar(null);
    setErrorAlBorrar(null);
    setSaliendo(conversacion.id);
    iniciarBorrado(async () => {
      try {
        await Promise.all([borrar(conversacion.id), esperar(DURACION_DE_SALIDA_MS)]);
      } catch {
        setSaliendo(null);
        setErrorAlBorrar(`No se pudo borrar «${conversacion.titulo}». Revisá tu conexión y probá de nuevo.`);
        return;
      }
      quitarConversacion(conversacion.id);
      setSaliendo(null);
      if (conversacion.id === conversacionId) nuevaConversacion(true);
    });
  }

  return (
    <>
      {/* Fondo oscuro detrás del Drawer en mobile: tocarlo lo cierra. */}
      {abierto && (
        <div
          {...FONDO_DEL_MODAL}
          aria-hidden="true"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-20 bg-slate-900/40 md:hidden"
        />
      )}

      <nav
        ref={barraRef}
        id="barra-lateral"
        aria-label="Menú principal"
        // Como cajón (celular, abierta) es un diálogo modal; fija al costado (tablet y compu), un landmark de navegación.
        role={abierto ? "dialog" : undefined}
        aria-modal={abierto || undefined}
        className={`${
          abierto ? "fixed inset-y-0 left-0 z-30 flex w-72 shadow-xl" : "hidden"
        } flex-col border-r border-borde bg-fondo md:static md:flex md:w-72 md:shrink-0 md:shadow-none`}
      >
        {/* Solo en celular: la ✕ para cerrar va sola en su fila, arriba a la derecha (no compite con «Nueva conversación»). */}
        <div className="flex justify-end px-2 pt-2 md:hidden">
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-tinta-suave hover:bg-superficie-fuerte/70"
            aria-label="Cerrar el menú"
          >
            <Icono nombre="cerrar" className="size-5" />
          </button>
        </div>

        <div className="p-2">
          {/* Sigue siendo un link a `/` (una conversación nueva): con Ctrl o Cmd se abre en otra pestaña; con un click
              común se cambia en pantalla, sin recargar. */}
          <Link
            ref={primerLinkRef}
            href={RUTAS.inicio}
            onClick={(evento) => {
              if (!esClickComun(evento)) return;
              evento.preventDefault();
              setAbierto(false);
              nuevaConversacion();
            }}
            className={`${ITEM} font-medium hover:bg-superficie-fuerte/70`}
          >
            <Icono nombre="conversacionNueva" className="size-5 shrink-0" />
            Nueva conversación
          </Link>
        </div>

        <ul aria-label="Atajos" className="space-y-0.5 px-2 pb-2">
          {ATAJOS.map((atajo) => (
            <li key={atajo.id}>
              <button
                type="button"
                onClick={() => elegirAtajo(atajo)}
                disabled={generando}
                className={`${ITEM} hover:bg-superficie-fuerte/70 disabled:opacity-50`}
              >
                <Icono nombre={atajo.icono} className="size-5 shrink-0 text-tinta-suave" />
                {atajo.titulo}
              </button>
            </li>
          ))}
        </ul>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <section aria-labelledby="titulo-conversaciones">
            <h2
              id="titulo-conversaciones"
              className="px-5 pt-3 pb-1 text-xs font-semibold tracking-wide text-tinta-suave uppercase"
            >
              Conversaciones
            </h2>
            {/* Región viva siempre montada: así el lector de pantalla anuncia el aviso cuando aparece. */}
            <p role="status" className="px-5 text-sm text-peligro empty:hidden">
              {errorAlBorrar}
            </p>
            {conversaciones.length === 0 ? (
              <p className="px-5 py-2 text-sm text-tinta-suave">Todavía no tenés conversaciones guardadas.</p>
            ) : (
              <ul className="space-y-0.5 px-2 pb-2" aria-busy={borrando}>
                {conversaciones.map((conversacion) => {
                  const esLaActual = conversacion.id === conversacionId;
                  const seEstaPlegando = conversacion.id === saliendo;
                  return (
                    // Al borrar, el ítem se pliega (alto y opacidad a cero) antes de salir de la lista; al aparecer uno
                    // nuevo, sube y se hace visible.
                    <li
                      key={conversacion.id}
                      className={`group relative transition-[max-height,opacity] duration-300 ease-in motion-reduce:transition-none motion-safe:animate-aparecer ${
                        seEstaPlegando
                          ? "pointer-events-none max-h-0 overflow-hidden opacity-0"
                          : "max-h-12 opacity-100"
                      }`}
                    >
                      <Link
                        href={rutaDeConversacion(conversacion.id)}
                        onClick={(evento) => {
                          if (!esClickComun(evento)) return;
                          evento.preventDefault();
                          setAbierto(false);
                          void abrirConversacion(conversacion.id);
                        }}
                        aria-current={esLaActual ? "page" : undefined}
                        className={`block min-h-11 truncate rounded-xl py-3 pr-12 pl-3 text-sm focus-visible:outline-offset-[-3px] ${
                          esLaActual
                            ? "bg-superficie-fuerte font-medium text-tinta"
                            : "text-tinta hover:bg-superficie-fuerte/70"
                        }`}
                      >
                        {/* key: cuando el asistente cambia el título, el texto nuevo entra con una animación. */}
                        <span key={conversacion.titulo} className="block truncate motion-safe:animate-aparecer">
                          {conversacion.titulo}
                        </span>
                      </Link>
                      {/* Con mouse, el botón de borrar aparece al pasar o enfocar; en pantallas táctiles (celular o tablet) siempre está a mano. */}
                      <button
                        type="button"
                        onClick={() => setPorBorrar(conversacion)}
                        disabled={borrando}
                        aria-label={`Borrar la conversación «${conversacion.titulo}»`}
                        className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-tinta-suave hover:bg-peligro-suave hover:text-peligro focus-visible:opacity-100 focus-visible:outline-offset-[-3px] disabled:opacity-50 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                      >
                        <Icono nombre="borrar" className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* El perfil va al pie de la barra en tablet y compu; en celular está en la esquina del encabezado. */}
        <div className="hidden border-t border-borde p-2 md:block">
          <PerfilDeUsuario
            nombre={usuario.nombre}
            avatarUrl={usuario.avatarUrl}
            cerrarSesion={cerrarSesion}
            onAbrirDebug={() => {
              setAbierto(false);
              abrirDebug();
            }}
          />
        </div>
      </nav>

      <DialogoDeConfirmacion
        abierto={porBorrar !== null}
        titulo="¿Borrar la conversación?"
        descripcion={`Se va a borrar «${porBorrar?.titulo ?? ""}» con todos sus mensajes. No se puede deshacer. Tus movimientos registrados no se tocan.`}
        textoConfirmar="Borrar"
        peligro
        onCancelar={() => setPorBorrar(null)}
        onConfirmar={() => porBorrar && borrarLaConversacion(porBorrar)}
      />
    </>
  );
}

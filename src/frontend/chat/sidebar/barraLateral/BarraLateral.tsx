"use client";

import Link from "next/link";
import { FONDO_DEL_MODAL } from "@/frontend/compartidos/useModal";
import { useChatEnPantalla } from "../../estado/ContextoDelChat";
import { usePaneles } from "../../estado/ContextoDePaneles";
import Icono from "../../compartidos/iconos";
import { RUTAS } from "@/shared/rutas";
import { esClickComun } from "../../compartidos/navegacion";
import PerfilDeUsuario from "../PerfilDeUsuario";
import type { Atajo } from "../../conversacion/respuesta";
import AtajosDelMenu from "./AtajosDelMenu";
import { ITEM_DE_LA_BARRA } from "./estilos";
import ListaDeConversaciones from "./ListaDeConversaciones";
import { useCajonDelMenu } from "./useCajonDelMenu";

type Props = {
  /** Server action que borra una conversación del usuario. */
  borrar: (id: string) => Promise<void>;
  /** Quién está logueado, para el perfil al pie. */
  usuario: { nombre: string; avatarUrl: string | null };
  /** Server action que cierra la sesión. */
  cerrarSesion: () => Promise<void>;
};

/**
 * La barra lateral, de arriba abajo: «Nueva conversación», los atajos (las funciones de siempre a un toque), la lista de
 * conversaciones y, al pie, el perfil con el menú para cerrar sesión. Cada parte está en su archivo: AtajosDelMenu,
 * ListaDeConversaciones (con el borrado) e ItemDeConversacion; el comportamiento de cajón, en useCajonDelMenu.
 * En tablet y compu queda fija al costado; en celular es un Drawer que abre la hamburguesa del encabezado (patrón de la clase 9).
 */
export default function BarraLateral({ borrar, usuario, cerrarSesion }: Props) {
  const { nuevaConversacion, usarAtajo, generando } = useChatEnPantalla();
  // En celular la hamburguesa del encabezado abre el menú; acá se cierra.
  const { abrirDebug, menuAbierto: abierto, setMenuAbierto: setAbierto } = usePaneles();
  const { barraRef, primerLinkRef } = useCajonDelMenu(abierto, setAbierto);
  const Contenedor = abierto ? "div" : "nav";

  function elegirAtajo(atajo: Atajo) {
    setAbierto(false);
    usarAtajo(atajo);
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

      <Contenedor
        ref={barraRef}
        id="barra-lateral"
        aria-label="Menú principal"
        // Como cajón (celular, abierta) es un diálogo modal en un <div> (un <nav> no puede tener ese rol); fija al costado
        // (tablet y compu), un landmark de navegación.
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
            className={`${ITEM_DE_LA_BARRA} font-medium hover:bg-superficie-fuerte/70`}
          >
            <Icono nombre="conversacionNueva" className="size-5 shrink-0" />
            Nueva conversación
          </Link>
        </div>

        <AtajosDelMenu onElegir={elegirAtajo} deshabilitado={generando} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ListaDeConversaciones borrar={borrar} alElegir={() => setAbierto(false)} />
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
      </Contenedor>
    </>
  );
}

"use client";

import Link from "next/link";
import { useChatEnPantalla } from "../estado/ContextoDelChat";
import Icono from "./iconos";
import { esClickComun } from "./navegacion";
import PerfilDeUsuario from "../sidebar/PerfilDeUsuario";

type Props = {
  /** Quién está logueado (su foto abre el menú del perfil en celular). */
  usuario: { nombre: string; avatarUrl: string | null };
  /** Server action que cierra la sesión. */
  cerrarSesion: () => Promise<void>;
};

const BOTON_DEL_ENCABEZADO = "grid size-11 place-items-center rounded-xl text-slate-800 transition hover:bg-slate-100";

/**
 * El encabezado con el único <h1>. El título lleva a una conversación nueva, desde cero, como el logo de cualquier sitio
 * lleva al inicio. Sigue siendo un link (`/` abre una conversación nueva): con Ctrl o Cmd se abre en otra pestaña; con un
 * click común se cambia en pantalla, sin recargar.
 *
 * En celular (menos de 768 px) el título va en el medio, en dos líneas y más chico; a la izquierda, la hamburguesa que abre
 * las conversaciones (patrón «drawer»); a la derecha, el botón del balance del mes y, en la esquina, la foto del perfil con
 * su menú. En tablet el perfil sigue en la barra lateral y queda el botón del balance; en compu, el título a la izquierda
 * y nada más (el balance y el perfil están fijos a los costados). Todos los botones miden 44 px y llevan su nombre.
 */
export default function EncabezadoDeLaApp({ usuario, cerrarSesion }: Props) {
  const { nuevaConversacion, menuAbierto, setMenuAbierto, balanceAbierto, setBalanceAbierto, abrirDebug } =
    useChatEnPantalla();
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 border-b border-slate-200 bg-white px-2 py-1 md:flex md:justify-between md:px-4 md:py-0">
      <div className="justify-self-start md:hidden">
        <button
          id="boton-menu"
          type="button"
          aria-label="Conversaciones"
          aria-expanded={menuAbierto}
          aria-controls="barra-lateral"
          onClick={() => setMenuAbierto(true)}
          className={BOTON_DEL_ENCABEZADO}
        >
          <Icono nombre="menu" className="size-6" />
        </button>
      </div>

      <h1 className="text-center text-sm leading-tight font-bold text-slate-900 md:py-3 md:text-left md:text-lg md:leading-normal">
        <Link
          href="/"
          onClick={(evento) => {
            if (!esClickComun(evento)) return;
            evento.preventDefault();
            nuevaConversacion();
          }}
          className="rounded-lg hover:text-blue-800"
        >
          {/* En celular cada parte va en su línea; desde tablet, todo en una. */}
          <span className="block md:inline">Administrador</span> <span className="block md:inline">de Finanzas</span>
        </Link>
      </h1>

      <div className="flex items-center gap-1 justify-self-end">
        <button
          id="boton-balance"
          type="button"
          aria-label="Balance del mes"
          aria-expanded={balanceAbierto}
          aria-controls={balanceAbierto ? "panel-balance" : undefined}
          onClick={() => setBalanceAbierto(true)}
          className={`${BOTON_DEL_ENCABEZADO} lg:hidden`}
        >
          <Icono nombre="resumen" className="size-5" />
        </button>
        <div className="md:hidden">
          <PerfilDeUsuario
            variante="encabezado"
            nombre={usuario.nombre}
            avatarUrl={usuario.avatarUrl}
            cerrarSesion={cerrarSesion}
            onAbrirDebug={abrirDebug}
          />
        </div>
      </div>
    </header>
  );
}

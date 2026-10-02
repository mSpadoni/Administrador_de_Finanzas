"use client";

import Link from "next/link";
import { rutaDeConversacion } from "@/shared/rutas";
import Icono from "../../compartidos/iconos";
import { esClickComun } from "../../compartidos/navegacion";
import type { ItemConversacion } from "../sidebar";

type Props = {
  conversacion: ItemConversacion;
  /** Es la que está abierta en pantalla. */
  esLaActual: boolean;
  /** Se borró (se puede deshacer o el servidor la está borrando): se pliega y queda fuera del alcance del teclado. */
  seEstaPlegando: boolean;
  /** Abrir esta conversación en pantalla (sin recargar). */
  onAbrir: () => void;
  /** Borrarla (se puede deshacer desde el aviso). */
  onPedirBorrar: () => void;
};

/**
 * Una conversación de la lista: el link para abrirla y el botón para borrarla. Sigue siendo un link de verdad: con Ctrl o
 * Cmd se abre en otra pestaña; con un click común se cambia en pantalla.
 */
export default function ItemDeConversacion({
  conversacion,
  esLaActual,
  seEstaPlegando,
  onAbrir,
  onPedirBorrar,
}: Props) {
  return (
    // Al borrar, el ítem se pliega (alto y opacidad a cero) antes de salir de la lista; al aparecer uno nuevo, sube y se
    // hace visible.
    <li
      data-conversacion={conversacion.id}
      inert={seEstaPlegando || undefined}
      className={`group relative transition-[max-height,opacity] duration-300 ease-in motion-reduce:transition-none motion-safe:animate-aparecer ${
        seEstaPlegando ? "pointer-events-none max-h-0 overflow-hidden opacity-0" : "max-h-12 opacity-100"
      }`}
    >
      <Link
        href={rutaDeConversacion(conversacion.id)}
        onClick={(evento) => {
          if (!esClickComun(evento)) return;
          evento.preventDefault();
          onAbrir();
        }}
        aria-current={esLaActual ? "page" : undefined}
        className={`block min-h-11 truncate rounded-xl py-3 pr-12 pl-3 text-sm focus-visible:outline-offset-[-3px] ${
          esLaActual ? "bg-superficie-fuerte font-medium text-tinta" : "text-tinta hover:bg-superficie-fuerte/70"
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
        onClick={onPedirBorrar}
        aria-label={`Borrar la conversación «${conversacion.titulo}»`}
        className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-tinta-suave hover:bg-peligro-suave hover:text-peligro focus-visible:opacity-100 focus-visible:outline-offset-[-3px] [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
      >
        <Icono nombre="borrar" className="size-4" />
      </button>
    </li>
  );
}

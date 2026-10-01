"use client";

import { useState, useTransition } from "react";
import DialogoDeConfirmacion from "@/frontend/compartidos/DialogoDeConfirmacion";
import Icono from "../compartidos/iconos";
import MenuDesplegable from "../compartidos/MenuDesplegable";

type Props = {
  /** El nombre para mostrar (el de Google, o el email si no hay nombre). */
  nombre: string;
  /** La foto de la cuenta de Google, si tiene. */
  avatarUrl: string | null;
  /** Server action que cierra la sesión (la conecta la página). */
  cerrarSesion: () => Promise<void>;
  /** Abre el panel de debug (función secundaria del perfil). */
  onAbrirDebug: () => void;
  /**
   * Dónde se usa: `barra` (al pie de la barra lateral, foto y nombre, el menú se abre hacia arriba) o `encabezado` (en
   * celular: solo la foto, en la esquina, y el menú se abre hacia abajo).
   */
  variante?: "barra" | "encabezado";
};

const ITEM_DEL_MENU =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-100 focus-visible:bg-slate-100";

/** La foto de la persona; si no tiene o no carga, un círculo con su inicial. Es decorativa: el nombre va al lado. */
function Avatar({ nombre, avatarUrl }: { nombre: string; avatarUrl: string | null }) {
  const [fallo, setFallo] = useState(false);
  if (avatarUrl && !fallo) {
    return (
      // <img> y no next/image: es una foto chica de un dominio de Google y no hace falta optimizarla ni configurarla.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={32}
        height={32}
        referrerPolicy="no-referrer"
        onError={() => setFallo(true)}
        className="size-8 shrink-0 rounded-full"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-700 text-sm font-semibold text-white"
    >
      {nombre.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/**
 * El perfil al pie de la barra lateral: foto y nombre. Al tocarlo se abre un menú con sus funciones secundarias: el
 * «Panel de debug» y «Cerrar sesión» (que antes de cerrar pregunta, porque corta lo que la persona estaba haciendo).
 */
export default function PerfilDeUsuario({ nombre, avatarUrl, cerrarSesion, onAbrirDebug, variante = "barra" }: Props) {
  const enElEncabezado = variante === "encabezado";
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, iniciarCierre] = useTransition();

  return (
    <>
      <MenuDesplegable
        etiqueta={`Cuenta de ${nombre}`}
        lado={enElEncabezado ? "abajo" : "arriba"}
        alineado={enElEncabezado ? "fin" : "inicio"}
        claseDelBoton={
          enElEncabezado
            ? "grid size-11 place-items-center rounded-full transition hover:bg-slate-100"
            : "flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-100"
        }
        boton={
          enElEncabezado ? (
            <Avatar nombre={nombre} avatarUrl={avatarUrl} />
          ) : (
            <>
              <Avatar nombre={nombre} avatarUrl={avatarUrl} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{nombre}</span>
              <Icono nombre="arribaAbajo" className="size-4 shrink-0 text-slate-600" />
            </>
          )
        }
      >
        {(cerrar) => (
          <>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                cerrar();
                onAbrirDebug();
              }}
              className={ITEM_DEL_MENU}
            >
              <Icono nombre="debug" className="size-5 shrink-0" />
              Panel de debug
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                cerrar();
                setConfirmando(true);
              }}
              className={ITEM_DEL_MENU}
            >
              <Icono nombre="cerrarSesion" className="size-5 shrink-0" />
              Cerrar sesión
            </button>
          </>
        )}
      </MenuDesplegable>

      <DialogoDeConfirmacion
        abierto={confirmando}
        titulo="¿Cerrar sesión?"
        descripcion="Vas a tener que volver a ingresar con Google para usar el asistente. Tus movimientos y conversaciones quedan guardados."
        textoConfirmar="Cerrar sesión"
        textoPendiente="Cerrando sesión…"
        pendiente={cerrando}
        onCancelar={() => setConfirmando(false)}
        onConfirmar={() =>
          iniciarCierre(async () => {
            await cerrarSesion();
          })
        }
      />
    </>
  );
}

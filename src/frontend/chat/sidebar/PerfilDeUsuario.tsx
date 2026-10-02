"use client";

import { useState, useTransition } from "react";
import DialogoDeConfirmacion from "@/frontend/compartidos/DialogoDeConfirmacion";
import DialogoDeTamanoDeLetra from "@/frontend/compartidos/DialogoDeTamanoDeLetra";
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

const ITEM_BASE = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition";
const ITEM_DEL_MENU = `${ITEM_BASE} text-tinta hover:bg-superficie-suave focus-visible:bg-superficie-suave`;
/** «Cerrar sesión»: en rojo, porque te saca de la app. */
const ITEM_DE_SALIDA = `${ITEM_BASE} text-peligro hover:bg-peligro-suave focus-visible:bg-peligro-suave`;

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
      className="grid size-8 shrink-0 place-items-center rounded-full bg-marca text-sm font-semibold text-sobre-marca"
    >
      {nombre.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/**
 * El perfil al pie de la barra lateral: foto y nombre. Al tocarlo se abre un menú con sus funciones secundarias: el
 * «Panel de debug», «Tamaño de letra…» y, al final y en rojo, «Cerrar sesión» (que antes de cerrar pregunta, porque corta
 * lo que la persona estaba haciendo).
 */
export default function PerfilDeUsuario({ nombre, avatarUrl, cerrarSesion, onAbrirDebug, variante = "barra" }: Props) {
  const enElEncabezado = variante === "encabezado";
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, iniciarCierre] = useTransition();
  const [ajustandoLetra, setAjustandoLetra] = useState(false);

  return (
    <>
      <MenuDesplegable
        etiqueta={`Cuenta de ${nombre}`}
        lado={enElEncabezado ? "abajo" : "arriba"}
        alineado={enElEncabezado ? "fin" : "inicio"}
        claseDelBoton={
          enElEncabezado
            ? "grid size-11 place-items-center rounded-full transition hover:bg-superficie-suave"
            : "flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-superficie-suave"
        }
        boton={
          enElEncabezado ? (
            <Avatar nombre={nombre} avatarUrl={avatarUrl} />
          ) : (
            <>
              <Avatar nombre={nombre} avatarUrl={avatarUrl} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-tinta">{nombre}</span>
              <Icono nombre="arribaAbajo" className="size-4 shrink-0 text-tinta-suave" />
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
            {/* Tamaño de letra (accesibilidad): abre una ventanita con una barra para achicarla o agrandarla. */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                cerrar();
                setAjustandoLetra(true);
              }}
              className={ITEM_DEL_MENU}
            >
              <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center text-sm font-semibold">
                Aa
              </span>
              Tamaño de letra…
            </button>
            {/* Cerrar sesión va al final y en rojo: es la acción que te saca de la app (pide confirmación). */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                cerrar();
                setConfirmando(true);
              }}
              className={ITEM_DE_SALIDA}
            >
              <Icono nombre="cerrarSesion" className="size-5 shrink-0" />
              Cerrar sesión
            </button>
          </>
        )}
      </MenuDesplegable>

      <DialogoDeTamanoDeLetra abierto={ajustandoLetra} onCerrar={() => setAjustandoLetra(false)} />

      <DialogoDeConfirmacion
        abierto={confirmando}
        titulo="¿Cerrar sesión?"
        descripcion="Vas a tener que volver a ingresar con Google para usar el asistente. Tus movimientos y conversaciones quedan guardados."
        textoConfirmar="Cerrar sesión"
        textoPendiente="Cerrando sesión…"
        // En rojo, como «Borrar» y como «Cerrar sesión» en el menú: es la acción que te saca de la app.
        peligro
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

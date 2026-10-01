"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type Props = {
  /** El nombre accesible del botón que abre el menú (el botón puede llevar solo un ícono). */
  etiqueta: string;
  /** Lo que se ve dentro del botón (ícono, avatar, texto). */
  boton: ReactNode;
  /** Las clases del botón (cada uso lo dibuja a su manera). */
  claseDelBoton: string;
  /** Hacia dónde se abre: arriba del botón (ej. el campo de texto, el perfil al pie) o abajo. */
  lado?: "arriba" | "abajo";
  /** Alineación horizontal del menú respecto del botón. */
  alineado?: "inicio" | "fin";
  deshabilitado?: boolean;
  /** Clases del contenedor del botón y el menú (para ubicarlo en una grilla o un flex). */
  claseDelContenedor?: string;
  /** Los ítems del menú: botones con `role="menuitem"`. Reciben `cerrar` para cerrarlo al elegir uno. */
  children: (cerrar: () => void) => ReactNode;
};

const ITEMS = '[role="menuitem"]:not(:disabled)';

/**
 * Un menú desplegable accesible (patrón «menu button» de la guía WAI-ARIA): el botón anuncia que abre un menú y si está
 * abierto; al abrirlo el foco pasa al primer ítem; las flechas, Inicio y Fin recorren los ítems; Escape lo cierra y
 * devuelve el foco al botón; Tab o un click afuera lo cierran. Lo usan el «+» del campo de texto y el perfil.
 */
export default function MenuDesplegable({
  etiqueta,
  boton,
  claseDelBoton,
  lado = "abajo",
  alineado = "inicio",
  deshabilitado = false,
  claseDelContenedor = "",
  children,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const idDelMenu = useId();

  /** Cierra el menú; `devolverFoco`: al botón (Escape, elegir un ítem), no cuando se hizo click en otro lado. */
  function cerrar(devolverFoco = true) {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  }

  // Al abrir, el foco va al primer ítem; mientras está abierto, un click afuera lo cierra.
  useEffect(() => {
    if (!abierto) return;
    menuRef.current?.querySelector<HTMLElement>(ITEMS)?.focus();
    const alHacerClick = (evento: MouseEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", alHacerClick);
    return () => document.removeEventListener("mousedown", alHacerClick);
  }, [abierto]);

  function alPresionarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>(ITEMS) ?? [])];
    const actual = items.indexOf(document.activeElement as HTMLElement);
    const enfocar = (indice: number) => items[(indice + items.length) % items.length]?.focus();
    switch (evento.key) {
      case "Escape":
        evento.preventDefault();
        cerrar();
        break;
      case "Tab":
        cerrar(false);
        break;
      case "ArrowDown":
        evento.preventDefault();
        enfocar(actual + 1);
        break;
      case "ArrowUp":
        evento.preventDefault();
        enfocar(actual - 1);
        break;
      case "Home":
        evento.preventDefault();
        enfocar(0);
        break;
      case "End":
        evento.preventDefault();
        enfocar(-1);
        break;
    }
  }

  return (
    <div ref={contenedorRef} className={`relative ${claseDelContenedor}`}>
      <button
        ref={botonRef}
        type="button"
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idDelMenu : undefined}
        disabled={deshabilitado}
        onClick={() => setAbierto((estaba) => !estaba)}
        className={claseDelBoton}
      >
        {boton}
      </button>
      {abierto && (
        <div
          ref={menuRef}
          id={idDelMenu}
          role="menu"
          aria-label={etiqueta}
          onKeyDown={alPresionarTecla}
          className={`absolute z-40 min-w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ${
            lado === "arriba" ? "bottom-full mb-2" : "top-full mt-2"
          } ${alineado === "inicio" ? "left-0" : "right-0"}`}
        >
          {children(() => cerrar())}
        </div>
      )}
    </div>
  );
}

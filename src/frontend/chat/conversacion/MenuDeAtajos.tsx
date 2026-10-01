"use client";

import Icono from "../compartidos/iconos";
import MenuDesplegable from "../compartidos/MenuDesplegable";
import { ATAJOS, type Atajo } from "./respuesta";

type Props = {
  /** Qué hacer con el atajo elegido (se le manda directo al asistente). */
  onUsar: (atajo: Atajo) => void;
  deshabilitado: boolean;
  /** Dónde queda el botón dentro del campo de texto (cambia cuando el campo pasa a dos filas). */
  claseDelContenedor?: string;
};

/**
 * El botón «+» del campo de texto: abre el menú de atajos (resumen del mes, gastos por categoría, dólar…), las mismas
 * consultas que están en la barra lateral. Cada ítem dice qué hace y, debajo, la pregunta que le va a mandar al asistente.
 */
export default function MenuDeAtajos({ onUsar, deshabilitado, claseDelContenedor }: Props) {
  return (
    <MenuDesplegable
      etiqueta="Atajos"
      lado="arriba"
      deshabilitado={deshabilitado}
      claseDelContenedor={claseDelContenedor}
      claseDelBoton="grid size-11 shrink-0 place-items-center rounded-full text-tinta-suave transition hover:bg-superficie-suave disabled:opacity-50"
      boton={<Icono nombre="mas" className="size-6" />}
    >
      {(cerrar) =>
        ATAJOS.map((atajo) => (
          <button
            key={atajo.id}
            type="button"
            role="menuitem"
            onClick={() => {
              cerrar();
              onUsar(atajo);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-superficie-suave focus-visible:bg-superficie-suave"
          >
            <Icono nombre={atajo.icono} className="size-5 shrink-0 text-tinta-suave" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-tinta">{atajo.titulo}</span>
              <span className="block truncate text-xs text-tinta-suave">{atajo.descripcion}</span>
            </span>
          </button>
        ))
      }
    </MenuDesplegable>
  );
}

"use client";

import Icono from "../compartidos/iconos";
import { ATAJOS, type Atajo } from "../conversacion/respuesta";
import { ITEM_DE_LA_BARRA } from "./estilos";

type Props = {
  /** Qué hacer al elegir un atajo (cerrar el cajón y mandar el pedido). */
  onElegir: (atajo: Atajo) => void;
  /** Mientras el asistente responde no se puede pedir otra cosa. */
  deshabilitado: boolean;
};

/** Los atajos de la barra lateral: las funciones de siempre («Resumen del mes», «Cotización del dólar»…) a un toque. */
export default function AtajosDelMenu({ onElegir, deshabilitado }: Props) {
  return (
    <ul aria-label="Atajos" className="space-y-0.5 px-2 pb-2">
      {ATAJOS.map((atajo) => (
        <li key={atajo.id}>
          <button
            type="button"
            onClick={() => onElegir(atajo)}
            disabled={deshabilitado}
            className={`${ITEM_DE_LA_BARRA} hover:bg-superficie-fuerte/70 disabled:opacity-50`}
          >
            <Icono nombre={atajo.icono} className="size-5 shrink-0 text-tinta-suave" />
            {atajo.titulo}
          </button>
        </li>
      ))}
    </ul>
  );
}

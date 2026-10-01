"use client";

import { useId, useState, type ChangeEvent, type KeyboardEvent, type RefObject } from "react";
import { MAX_CARACTERES_MENSAJE } from "@/shared/chat";
import Icono from "../compartidos/iconos";
import MenuDeAtajos from "./MenuDeAtajos";
import type { Atajo } from "./respuesta";

/**
 * Props del campo de texto. El estado (el texto escrito) no vive acá sino en el chat (el componente padre):
 * este componente lo recibe en `valor` y avisa cambios con `onCambio`. Es un "componente controlado".
 * `(valor: string) => void`: tipo de una función que recibe un texto y no devuelve nada.
 * `textareaRef`: referencia al <textarea> real, para que el padre pueda ponerle el foco.
 */
type Props = {
  valor: string;
  onCambio: (valor: string) => void;
  onEnviar: () => void;
  onDetener: () => void;
  /** Qué hacer con un atajo elegido en el menú «+». */
  onUsarAtajo: (atajo: Atajo) => void;
  /** true mientras el asistente está respondiendo: no se puede enviar, pero sí detenerlo. */
  generando: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

/**
 * Alto (px) a partir del cual el texto ya no entra en una línea: una línea mide 44 (el mínimo del campo) y dos, unos 68. Con
 * más que esto, los botones bajan a una segunda fila.
 */
const ALTURA_DE_UNA_LINEA_PX = 50;

/** Dónde queda el botón de enviar (o detener): a la derecha del texto, o en la segunda fila cuando el campo pasó a dos filas. */
const UBICACION_DEL_ENVIAR = ["col-start-3 row-start-1", "col-start-3 row-start-2"] as const;

const BOTON_REDONDO = "grid size-11 shrink-0 place-items-center rounded-full transition";

/**
 * Campo para escribir el mensaje, en un contenedor redondeado: el «+» de los atajos a la izquierda, el texto (que crece
 * con lo que se escribe) y el botón de enviar a la derecha. Cuando el texto ya no entra en una línea (o tiene saltos de
 * línea), los dos botones bajan a una segunda fila, uno en cada punta, como en ChatGPT: el texto usa todo el ancho.
 * Valida que no esté vacío ni sea demasiado largo.
 */
export default function MessageInput({
  valor,
  onCambio,
  onEnviar,
  onDetener,
  onUsarAtajo,
  generando,
  textareaRef,
}: Props) {
  // useId genera ids únicos para conectar el <label> y el texto de ayuda con el <textarea> (accesibilidad).
  const idCampo = useId();
  const idAyuda = useId();
  const vacio = valor.trim().length === 0;
  const muyLargo = valor.length > MAX_CARACTERES_MENSAJE;
  const sePuedeEnviar = !vacio && !muyLargo && !generando;
  // Una vez que el texto pasó a dos filas, sigue así hasta que se vacía el campo (si no, al pasar a todo el ancho el texto
  // volvería a entrar en una línea y el campo saltaría de un lado al otro con cada letra).
  const [expandido, setExpandido] = useState(false);
  const dosFilas = expandido && valor !== "";

  /** Con cada cambio: avisa el texto nuevo y decide si ya no entra en una línea (se mide acá, con el texto recién escrito). */
  function alEscribir(evento: ChangeEvent<HTMLTextAreaElement>) {
    const campo = evento.target;
    const noEntraEnUnaLinea = campo.value.includes("\n") || campo.scrollHeight > ALTURA_DE_UNA_LINEA_PX;
    // `valor === ""` es el texto de antes del cambio: si el campo estaba vacío, se empieza de cero.
    setExpandido((estaba) => (valor === "" ? noEntraEnUnaLinea : estaba || noEntraEnUnaLinea));
    onCambio(campo.value);
  }

  // Se ejecuta con cada tecla dentro del textarea. `KeyboardEvent<HTMLTextAreaElement>`: evento de teclado sobre un textarea.
  function alPresionarTecla(evento: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envía; Shift+Enter hace un salto de línea (para pegar tablas o resoluciones largas).
    if (evento.key === "Enter" && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault(); // Evita que el Enter agregue un salto de línea.
      if (sePuedeEnviar) onEnviar();
    }
  }

  return (
    <form
      className="px-4 pt-2 pb-3"
      onSubmit={(evento) => {
        // preventDefault: evita que el navegador recargue la página al enviar el formulario (su comportamiento normal).
        evento.preventDefault();
        if (sePuedeEnviar) onEnviar();
      }}
    >
      {/* La etiqueta está para el lector de pantalla; a la vista, el placeholder alcanza porque el campo es único. */}
      <label htmlFor={idCampo} className="sr-only">
        Tu mensaje
      </label>
      {/* focus-within: el aro del contenedor reemplaza al foco del textarea (que no se dibuja) mientras se escribe. */}
      <div
        data-expandida={dosFilas}
        className={`grid grid-cols-[auto_1fr_auto] items-end gap-x-1 rounded-3xl border bg-white/80 p-1 shadow-md backdrop-blur-md focus-within:ring-2 sm:p-1.5 ${
          muyLargo ? "border-2 border-red-600 focus-within:ring-red-600" : "border-slate-500 focus-within:ring-blue-700"
        }`}
      >
        <MenuDeAtajos
          onUsar={onUsarAtajo}
          deshabilitado={generando}
          claseDelContenedor={dosFilas ? "col-start-1 row-start-2" : "col-start-1 row-start-1"}
        />
        <textarea
          id={idCampo}
          ref={textareaRef}
          value={valor}
          // Cada vez que el usuario escribe, se le pasa el texto nuevo al padre (evento.target es el textarea).
          onChange={alEscribir}
          onKeyDown={alPresionarTecla}
          rows={1}
          aria-describedby={idAyuda}
          aria-invalid={muyLargo}
          placeholder="Ej.: Gasté 5.000 en el súper…"
          // field-sizing-content: el campo crece con el texto hasta max-h-40 y ahí scrollea (donde el navegador no lo
          // soporta queda de una línea con scroll).
          className={`field-sizing-content max-h-40 min-h-11 resize-none bg-transparent py-2.5 text-base text-slate-900 outline-none placeholder:text-sm placeholder:text-slate-700 ${
            dosFilas ? "col-span-3 col-start-1 row-start-1 px-3" : "col-start-2 row-start-1 px-2"
          }`}
        />
        {/* Botón redondo abajo a la derecha: la acción más frecuente, al alcance del pulgar (Ley de Fitts).
            Mientras el asistente responde, el mismo lugar sirve para detenerlo (control del usuario, heurística #3). */}
        {generando ? (
          <button
            type="button"
            onClick={onDetener}
            aria-label="Detener"
            className={`${BOTON_REDONDO} ${UBICACION_DEL_ENVIAR[+dosFilas]} bg-slate-900 text-white hover:bg-slate-700`}
          >
            <Icono nombre="detener" className="size-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!sePuedeEnviar}
            aria-label="Enviar"
            className={`${BOTON_REDONDO} ${UBICACION_DEL_ENVIAR[+dosFilas]} bg-blue-700 text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600`}
          >
            <Icono nombre="enviar" className="size-5" />
          </button>
        )}
      </div>
      <p
        id={idAyuda}
        // Pasado el límite se anuncia solo (role="alert") y el envío queda bloqueado.
        role={muyLargo ? "alert" : undefined}
        className={`mt-1.5 px-3 text-xs ${muyLargo ? "font-medium text-red-700" : "text-slate-600"}`}
      >
        {muyLargo
          ? `⚠ No se puede enviar: tu mensaje tiene ${valor.length} caracteres; el máximo es ${MAX_CARACTERES_MENSAJE}. Acortalo o mandalo en partes.`
          : "Enter para enviar · Shift+Enter para un salto de línea"}
      </p>
    </form>
  );
}

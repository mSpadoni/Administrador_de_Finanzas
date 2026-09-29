"use client";

import { useId, type KeyboardEvent, type RefObject } from "react";
import { MAX_CARACTERES_MENSAJE } from "@/shared/chat";

/**
 * Props del campo de texto. El estado (el texto escrito) no vive acá sino en ChatWindow (el componente padre):
 * este componente lo recibe en `valor` y avisa cambios con `onCambio`. Es un "componente controlado".
 * `(valor: string) => void`: tipo de una función que recibe un texto y no devuelve nada.
 * `textareaRef`: referencia al <textarea> real, para que el padre pueda ponerle el foco.
 */
type Props = {
  valor: string;
  onCambio: (valor: string) => void;
  onEnviar: () => void;
  onDetener: () => void;
  /** true mientras el asistente está respondiendo: no se puede enviar, pero sí detenerlo. */
  generando: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

/** Campo para escribir el mensaje + botón Enviar. Valida que no esté vacío ni sea demasiado largo. */
export default function MessageInput({ valor, onCambio, onEnviar, onDetener, generando, textareaRef }: Props) {
  // useId genera ids únicos para conectar el <label> y el texto de ayuda con el <textarea> (accesibilidad).
  const idCampo = useId();
  const idAyuda = useId();
  const vacio = valor.trim().length === 0;
  const muyLargo = valor.length > MAX_CARACTERES_MENSAJE;

  // Se ejecuta con cada tecla dentro del textarea. `KeyboardEvent<HTMLTextAreaElement>`: evento de teclado sobre un textarea.
  function alPresionarTecla(evento: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envía; Shift+Enter hace un salto de línea (para pegar tablas o resoluciones largas).
    if (evento.key === "Enter" && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault(); // Evita que el Enter agregue un salto de línea.
      if (!vacio && !muyLargo && !generando) onEnviar();
    }
  }

  return (
    <form
      className="border-t border-slate-200 bg-white px-4 py-3"
      onSubmit={(evento) => {
        // preventDefault: evita que el navegador recargue la página al enviar el formulario (su comportamiento normal).
        evento.preventDefault();
        if (!vacio && !muyLargo && !generando) onEnviar();
      }}
    >
      <label htmlFor={idCampo} className="mb-1 block text-sm font-medium text-slate-800">
        Tu mensaje
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id={idCampo}
          ref={textareaRef}
          value={valor}
          // Cada vez que el usuario escribe, se le pasa el texto nuevo al padre (evento.target es el textarea).
          onChange={(evento) => onCambio(evento.target.value)}
          onKeyDown={alPresionarTecla}
          rows={3}
          aria-describedby={idAyuda}
          aria-invalid={muyLargo}
          placeholder="Ej.: Gasté 5.000 en el súper con débito"
          className="min-h-12 flex-1 resize-y rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-500"
        />
        {/* Botón grande y abajo a la derecha: la acción más frecuente, al alcance del pulgar (Ley de Fitts).
            Mientras el asistente responde, el mismo lugar sirve para detenerlo (control del usuario, heurística #3). */}
        {generando ? (
          <button
            type="button"
            onClick={onDetener}
            className="h-12 rounded-lg border border-slate-400 bg-white px-5 font-medium text-slate-900 transition hover:bg-slate-100"
          >
            <span aria-hidden="true">■ </span>Detener
          </button>
        ) : (
          <button
            type="submit"
            disabled={vacio || muyLargo}
            className="h-12 rounded-lg bg-blue-700 px-5 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
          >
            Enviar
          </button>
        )}
      </div>
      <p id={idAyuda} className={`mt-1 text-xs ${muyLargo ? "font-medium text-red-700" : "text-slate-600"}`}>
        {muyLargo
          ? `Tu mensaje tiene ${valor.length} caracteres; el máximo es ${MAX_CARACTERES_MENSAJE}. Acortalo o mandalo en partes.`
          : "Enter para enviar · Shift+Enter para un salto de línea"}
      </p>
    </form>
  );
}

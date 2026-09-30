"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { lineasDeUso } from "./actividad";
import { useChatEnPantalla } from "./ContextoDelChat";
import { respuestasParaDebug, totalesDeDebug, type HerramientaDeDebug, type RespuestaDeDebug } from "./debug";
import { formatoDuracion, formatoTokens } from "./formato";
import Icono from "./iconos";
import type { AsistenteUIMessage } from "@/shared/chat";

type Props = {
  mensajes: AsistenteUIMessage[];
  abierto: boolean;
  onCerrar: () => void;
};

/** Una herramienta que usó el modelo: qué hizo, y (plegado) lo que decidió pasarle y lo que devolvió. */
function Herramienta({ herramienta }: { herramienta: HerramientaDeDebug }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-2">
      <p className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="font-medium text-slate-900">
          <span aria-hidden="true">{herramienta.fallo ? "⚠ " : "✓ "}</span>
          {herramienta.texto}
        </span>
        <code className="rounded bg-slate-100 px-1 text-xs text-slate-700">{herramienta.nombre}</code>
      </p>
      <details className="mt-1 text-xs">
        <summary className="cursor-pointer rounded text-slate-700 select-none">Ver datos</summary>
        <p className="mt-1 font-medium text-slate-700">Lo que decidió pasarle el modelo:</p>
        <pre className="mt-0.5 overflow-x-auto rounded bg-slate-100 p-2 text-slate-800">{herramienta.entrada}</pre>
        <p className="mt-1 font-medium text-slate-700">Lo que devolvió:</p>
        <pre className="mt-0.5 overflow-x-auto rounded bg-slate-100 p-2 text-slate-800">
          {herramienta.salida ?? "Todavía sin resultado."}
        </pre>
      </details>
    </li>
  );
}

/** Una respuesta del asistente: el pedido, las herramientas que decidió usar y lo que costó. */
function Respuesta({ respuesta, numero }: { respuesta: RespuestaDeDebug; numero: number }) {
  const uso = lineasDeUso(respuesta.metadatos);
  return (
    <article aria-label={`Respuesta ${numero}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-sm font-semibold text-slate-900">
        Respuesta {numero}
        {respuesta.metadatos?.ms !== undefined && (
          <span className="font-normal text-slate-700"> · {formatoDuracion(respuesta.metadatos.ms)}</span>
        )}
      </h3>
      <p className="mt-0.5 truncate text-xs text-slate-600">Pedido: «{respuesta.pedido}»</p>
      {respuesta.herramientas.length === 0 ? (
        <p className="mt-2 text-xs text-slate-700">El modelo respondió sin usar herramientas.</p>
      ) : (
        <>
          <p className="mt-2 text-xs font-medium text-slate-700">Herramientas que decidió usar el modelo, en orden:</p>
          <ol aria-label="Herramientas" className="mt-1 space-y-1.5 text-sm">
            {respuesta.herramientas.map((herramienta) => (
              <Herramienta key={herramienta.id} herramienta={herramienta} />
            ))}
          </ol>
        </>
      )}
      {uso.length > 0 && (
        <ul aria-label="Uso" className="mt-2 space-y-0.5 border-t border-slate-200 pt-2 text-xs text-slate-700">
          {uso.map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ContenidoDelPanel({ mensajes, onCerrar }: Omit<Props, "abierto">) {
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const respuestas = respuestasParaDebug(mensajes);
  const totales = totalesDeDebug(respuestas);

  // Al abrir, el foco va al botón de cerrar; al cerrar, vuelve a donde estaba (el botón del menú que lo abrió).
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    cerrarRef.current?.focus();
    return () => anterior?.focus();
  }, []);

  function alPresionarTecla(evento: KeyboardEvent<HTMLElement>) {
    if (evento.key === "Escape") onCerrar();
  }

  return (
    <aside
      aria-label="Panel de debug"
      onKeyDown={alPresionarTecla}
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[28rem]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-3">
        <h2 className="text-base font-semibold text-slate-900">Panel de debug</h2>
        <button
          ref={cerrarRef}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar el panel de debug"
          className="grid size-11 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"
        >
          <Icono nombre="cerrar" className="size-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {respuestas.length === 0 ? (
          <p className="text-sm text-slate-700">Cuando el asistente responda, acá vas a ver qué hizo.</p>
        ) : (
          <>
            <section aria-label="Totales de la conversación" className="rounded-xl bg-slate-900 p-3 text-sm text-white">
              <p className="font-medium">Esta conversación</p>
              <p className="mt-1 text-slate-200 tabular-nums">
                {totales.respuestas} {totales.respuestas === 1 ? "respuesta" : "respuestas"} · {totales.herramientas}{" "}
                {totales.herramientas === 1 ? "herramienta" : "herramientas"} · {formatoDuracion(totales.ms)}
              </p>
              <p className="text-slate-200 tabular-nums">
                {formatoTokens(totales.tokens.total)} tokens ({formatoTokens(totales.tokens.entrada)} /{" "}
                {formatoTokens(totales.tokens.salida)} entrada / salida)
              </p>
            </section>
            {respuestas.map((respuesta, indice) => (
              <Respuesta key={respuesta.id} respuesta={respuesta} numero={indice + 1} />
            ))}
            <p className="text-xs text-slate-600">
              Los tiempos y los tokens se miden al generar cada respuesta: las de conversaciones que reabrís no los
              tienen.
            </p>
          </>
        )}
      </div>
    </aside>
  );
}

/**
 * El panel de debug (el bonus del challenge): un panel a la derecha que muestra, por cada respuesta, las llamadas a tools
 * que decidió el modelo (con sus datos y resultados), cuánto tardó y los tokens consumidos. Se abre desde el menú del
 * perfil, como función secundaria; mientras está cerrado no existe.
 */
export default function PanelDeDebug({ mensajes, abierto, onCerrar }: Props) {
  // El contenido (con sus efectos de foco) solo existe mientras el panel está abierto.
  return abierto ? <ContenidoDelPanel mensajes={mensajes} onCerrar={onCerrar} /> : null;
}

/** El panel conectado al chat de la pantalla (lo que se ve en la app). */
export function PanelDeDebugDelChat() {
  const { messages, debugAbierto, cerrarDebug } = useChatEnPantalla();
  return <PanelDeDebug mensajes={messages} abierto={debugAbierto} onCerrar={cerrarDebug} />;
}

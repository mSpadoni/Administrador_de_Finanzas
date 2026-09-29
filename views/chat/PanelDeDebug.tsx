"use client";

import { useEffect, useRef } from "react";
import type { AsistenteUIMessage } from "@/shared/chat";
import { respuestasParaDebug, totalesDeDebug, type EstadoDeLlamada, type RespuestaParaDebug } from "./debug";

type Props = {
  id: string;
  mensajes: AsistenteUIMessage[];
  abierto: boolean;
  onCerrar: () => void;
};

const numero = (valor: number) => valor.toLocaleString("es-AR");
const segundos = (ms: number) => `${(ms / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} s`;

/** Estado de cada tool con ícono Y texto (no solo color). */
const ESTADOS: Record<EstadoDeLlamada, { icono: string; clase: string }> = {
  "en curso": { icono: "…", clase: "text-slate-700" },
  lista: { icono: "✓", clase: "text-green-800" },
  "con error": { icono: "⚠", clase: "text-red-800" },
};

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs font-medium text-slate-700">{titulo}</summary>
      <pre className="mt-1 max-h-64 overflow-auto rounded bg-slate-100 p-2 text-[0.75rem] whitespace-pre-wrap text-slate-900">
        {texto}
      </pre>
    </details>
  );
}

function Respuesta({ respuesta, abierta }: { respuesta: RespuestaParaDebug; abierta: boolean }) {
  const { metadatos, llamadas } = respuesta;
  return (
    <li className="rounded-lg border border-slate-200 bg-white">
      <details open={abierta}>
        <summary className="cursor-pointer px-3 py-2 text-sm">
          <span className="font-medium text-slate-900">Respuesta {respuesta.numero}</span>
          <span className="block truncate text-xs text-slate-600">«{respuesta.pedido}»</span>
        </summary>
        <div className="space-y-3 border-t border-slate-200 px-3 py-2">
          {metadatos?.tokens ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-slate-600">Modelo</dt>
              <dd className="truncate font-mono text-slate-900">{metadatos.modelo ?? "—"}</dd>
              <dt className="text-slate-600">Pasos</dt>
              <dd className="text-slate-900">{metadatos.pasos ?? "—"}</dd>
              <dt className="text-slate-600">Tokens (entrada / salida)</dt>
              <dd className="text-slate-900">
                {numero(metadatos.tokens.entrada ?? 0)} / {numero(metadatos.tokens.salida ?? 0)}
              </dd>
              <dt className="text-slate-600">Demora</dt>
              <dd className="text-slate-900">{metadatos.ms !== undefined ? segundos(metadatos.ms) : "—"}</dd>
              <dt className="text-slate-600">Motivo de fin</dt>
              <dd className="font-mono text-slate-900">{metadatos.motivoDeFin ?? "—"}</dd>
            </dl>
          ) : (
            <p className="text-xs text-slate-600">
              {metadatos?.modelo
                ? `Respondiendo con ${metadatos.modelo}…`
                : "Sin tokens ni demora: es una respuesta de antes de abrir esta conversación."}
            </p>
          )}

          {llamadas.length === 0 ? (
            <p className="text-xs text-slate-600">Respondió sin usar tools.</p>
          ) : (
            <ol aria-label={`Tools de la respuesta ${respuesta.numero}`} className="space-y-2">
              {llamadas.map((llamada, i) => {
                const estado = ESTADOS[llamada.estado];
                return (
                  <li key={llamada.id} className="rounded border border-slate-200 p-2">
                    <p className="text-xs">
                      <span className="text-slate-600">{i + 1}. </span>
                      <span className="font-medium text-slate-900">{llamada.descripcion}</span>
                    </p>
                    <p className="text-xs">
                      <code className="font-mono text-slate-700">{llamada.herramienta}</code>
                      {" · "}
                      <span className={estado.clase}>
                        <span aria-hidden="true">{estado.icono} </span>
                        {llamada.estado}
                      </span>
                    </p>
                    <Bloque titulo="Entrada" texto={llamada.entrada} />
                    {llamada.salida !== null && <Bloque titulo="Salida" texto={llamada.salida} />}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </details>
    </li>
  );
}

/**
 * Panel de debug: qué tools eligió el modelo en cada respuesta, con qué datos y qué devolvieron, y cuántos
 * pasos, tokens y segundos llevó. Arranca plegado (divulgación progresiva); en escritorio queda al costado y en
 * mobile es un Drawer. Se arma con los mensajes que ya tiene useChat: no consulta nada.
 */
export default function PanelDeDebug({ id, mensajes, abierto, onCerrar }: Props) {
  const cerrarRef = useRef<HTMLButtonElement>(null);

  // Al abrirlo, el foco va adentro; con Escape se cierra.
  useEffect(() => {
    if (!abierto) return;
    cerrarRef.current?.focus();
    const alPresionarTecla = (evento: KeyboardEvent) => evento.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, [abierto, onCerrar]);

  const respuestas = respuestasParaDebug(mensajes);
  const totales = totalesDeDebug(respuestas);

  return (
    <>
      {/* Fondo oscuro detrás del Drawer en mobile: tocarlo lo cierra. */}
      {abierto && (
        <div aria-hidden="true" onClick={onCerrar} className="fixed inset-0 z-20 bg-slate-900/40 md:hidden" />
      )}
      <aside
        id={id}
        aria-labelledby="titulo-debug"
        className={`${
          abierto ? "fixed inset-y-0 right-0 z-30 flex w-80 shadow-xl md:static md:shadow-none" : "hidden"
        } flex-col border-l border-slate-200 bg-slate-50 md:w-96`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white p-3">
          <h2 id="titulo-debug" className="text-sm font-semibold text-slate-900">
            Panel de debug
          </h2>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar el panel de debug"
            className="rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          <p className="text-xs text-slate-700">
            Qué tools eligió el modelo en cada respuesta, con qué datos y qué devolvieron.
          </p>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              { titulo: "Tools", valor: numero(totales.llamadas) },
              { titulo: "Tokens", valor: numero(totales.tokens) },
              { titulo: "Demora", valor: segundos(totales.ms) },
            ].map((dato) => (
              <div key={dato.titulo} className="rounded-lg border border-slate-200 bg-white p-2">
                <dt className="text-xs text-slate-600">{dato.titulo}</dt>
                <dd className="text-sm font-semibold text-slate-900">{dato.valor}</dd>
              </div>
            ))}
          </dl>

          {respuestas.length === 0 ? (
            <p className="text-sm text-slate-600">Cuando el asistente responda, acá vas a ver qué hizo.</p>
          ) : (
            // La más reciente arriba y abierta; las anteriores, plegadas.
            <ol aria-label="Respuestas del asistente" className="space-y-2">
              {[...respuestas].reverse().map((respuesta, i) => (
                <Respuesta key={respuesta.id} respuesta={respuesta} abierta={i === 0} />
              ))}
            </ol>
          )}
        </div>
      </aside>
    </>
  );
}

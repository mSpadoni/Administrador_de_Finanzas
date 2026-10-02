"use client";

import { useEffect, useRef, useState } from "react";
import { useChatEnPantalla } from "../../estado/ContextoDelChat";
import { useSidebar } from "../EstadoSidebar";
import AvisoDeBorrado from "./AvisoDeBorrado";
import ItemDeConversacion from "./ItemDeConversacion";
import { useBorradoConDeshacer } from "./useBorradoConDeshacer";
import type { ItemConversacion } from "../sidebar";

type Props = {
  /** Server action que borra una conversación del usuario. */
  borrar: (id: string) => Promise<void>;
  /** Avisa que se eligió una conversación (en celular, para cerrar el cajón). */
  alElegir: () => void;
};

/**
 * La lista de conversaciones de la barra lateral, con el borrado. La lista viene del estado compartido del sidebar (ver
 * EstadoSidebar): se actualiza sin volver a consultar.
 */
export default function ListaDeConversaciones({ borrar, alElegir }: Props) {
  const { conversaciones, quitarConversacion } = useSidebar();
  const { conversacionId, nuevaConversacion, abrirConversacion } = useChatEnPantalla();
  const [errorAlBorrar, setErrorAlBorrar] = useState<string | null>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  // La conversación que estaba abierta cuando se la borró (para volver a abrirla si se deshace).
  const estabaAbiertaRef = useRef<string | null>(null);
  // La conversación que se acaba de recuperar con «Deshacer» (el foco vuelve a su link).
  const recuperadaRef = useRef<string | null>(null);

  /**
   * Borrar no pide confirmación: se puede deshacer (heurística #3, control y libertad). El ítem se pliega y aparece el
   * aviso con «Deshacer»; el servidor la borra recién cuando el aviso se va. Si el servidor falla, el ítem vuelve y se
   * avisa qué pasó (sin el aviso, parecería que se borró y volvió sola).
   */
  const borrado = useBorradoConDeshacer({
    borrar,
    alBorrar: (conversacion) => quitarConversacion(conversacion.id),
    alFallar: (conversacion) =>
      setErrorAlBorrar(`No se pudo borrar «${conversacion.titulo}». Revisá tu conexión y probá de nuevo.`),
  });

  function pedirBorrar(conversacion: ItemConversacion) {
    setErrorAlBorrar(null);
    borrado.pedirBorrar(conversacion);
    // Si era la abierta, se pasa ya a una conversación nueva (como si se hubiera borrado).
    estabaAbiertaRef.current = conversacion.id === conversacionId ? conversacion.id : null;
    if (conversacion.id === conversacionId) nuevaConversacion(true);
  }

  function deshacer() {
    const conversacion = borrado.pendiente;
    if (!conversacion) return;
    borrado.deshacer();
    recuperadaRef.current = conversacion.id;
    if (estabaAbiertaRef.current === conversacion.id) void abrirConversacion(conversacion.id);
  }

  // El foco nunca se pierde cuando el aviso se va: con «Deshacer», vuelve al link de la conversación recuperada; si se
  // cerró (o se cumplió el tiempo) con el foco adentro, va al título de la lista.
  const hayAviso = borrado.pendiente !== null;
  const habiaAvisoRef = useRef(false);
  useEffect(() => {
    // Solo cuando un aviso se va (no al cargar la página: ahí el foco tiene que arrancar desde el principio).
    const seFueUnAviso = habiaAvisoRef.current && !hayAviso;
    habiaAvisoRef.current = hayAviso;
    if (!seFueUnAviso) return;
    const recuperada = recuperadaRef.current;
    recuperadaRef.current = null;
    if (recuperada) {
      listaRef.current?.querySelector<HTMLElement>(`[data-conversacion="${recuperada}"] a`)?.focus();
    } else if (document.activeElement === document.body) {
      tituloRef.current?.focus();
    }
  }, [hayAviso]);

  return (
    <>
      <section aria-labelledby="titulo-conversaciones">
        <h2
          ref={tituloRef}
          id="titulo-conversaciones"
          tabIndex={-1}
          className="px-5 pt-3 pb-1 text-xs font-semibold tracking-wide text-tinta-suave uppercase focus-visible:outline-offset-[-3px]"
        >
          Conversaciones
        </h2>
        {/* Región viva siempre montada: así el lector de pantalla anuncia el aviso cuando aparece. */}
        <p role="status" className="px-5 text-sm text-peligro empty:hidden">
          {errorAlBorrar}
        </p>
        {conversaciones.length === 0 ? (
          <p className="px-5 py-2 text-sm text-tinta-suave">Todavía no tenés conversaciones guardadas.</p>
        ) : (
          <ul ref={listaRef} className="space-y-0.5 px-2 pb-2">
            {conversaciones.map((conversacion) => (
              <ItemDeConversacion
                key={conversacion.id}
                conversacion={conversacion}
                esLaActual={conversacion.id === conversacionId}
                seEstaPlegando={borrado.estaOculta(conversacion.id)}
                onAbrir={() => {
                  alElegir();
                  void abrirConversacion(conversacion.id);
                }}
                onPedirBorrar={() => pedirBorrar(conversacion)}
              />
            ))}
          </ul>
        )}
      </section>

      <AvisoDeBorrado
        conversacion={borrado.pendiente}
        onDeshacer={deshacer}
        onCerrar={borrado.confirmar}
        onPausar={borrado.pausar}
        onReanudar={borrado.reanudar}
      />
    </>
  );
}

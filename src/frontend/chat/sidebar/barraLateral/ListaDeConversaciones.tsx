"use client";

import { useState, useTransition } from "react";
import DialogoDeConfirmacion from "@/frontend/compartidos/DialogoDeConfirmacion";
import { useChatEnPantalla } from "../../estado/ContextoDelChat";
import { useSidebar } from "../EstadoSidebar";
import ItemDeConversacion from "./ItemDeConversacion";
import type { ItemConversacion } from "../sidebar";

type Props = {
  /** Server action que borra una conversación del usuario. */
  borrar: (id: string) => Promise<void>;
  /** Avisa que se eligió una conversación (en celular, para cerrar el cajón). */
  alElegir: () => void;
};

/** Lo que dura la animación con la que un ítem se pliega al borrarlo (ms). Es la misma duración de la clase `duration-300`. */
const DURACION_DE_SALIDA_MS = 300;

const esperar = (ms: number) => new Promise<void>((listo) => setTimeout(listo, ms));

/**
 * La lista de conversaciones de la barra lateral, con el borrado. La lista viene del estado compartido del sidebar (ver
 * EstadoSidebar): se actualiza sin volver a consultar.
 */
export default function ListaDeConversaciones({ borrar, alElegir }: Props) {
  const { conversaciones, quitarConversacion } = useSidebar();
  const { conversacionId, nuevaConversacion, abrirConversacion } = useChatEnPantalla();
  const [porBorrar, setPorBorrar] = useState<ItemConversacion | null>(null);
  const [saliendo, setSaliendo] = useState<string | null>(null); // La conversación que se está plegando al borrarla.
  const [errorAlBorrar, setErrorAlBorrar] = useState<string | null>(null);
  const [borrando, iniciarBorrado] = useTransition();

  /**
   * Borrar es la única acción destructiva: pide confirmación (heurística #3) en un diálogo propio. Al confirmar, el ítem se
   * pliega y se desvanece mientras el servidor la borra; si era la abierta, se pasa a una conversación nueva. Si el servidor
   * falla, el ítem vuelve a aparecer y se avisa qué pasó (sin el aviso, parecería que se borró y volvió sola).
   */
  function borrarLaConversacion(conversacion: ItemConversacion) {
    setPorBorrar(null);
    setErrorAlBorrar(null);
    setSaliendo(conversacion.id);
    iniciarBorrado(async () => {
      try {
        await Promise.all([borrar(conversacion.id), esperar(DURACION_DE_SALIDA_MS)]);
      } catch {
        setSaliendo(null);
        setErrorAlBorrar(`No se pudo borrar «${conversacion.titulo}». Revisá tu conexión y probá de nuevo.`);
        return;
      }
      quitarConversacion(conversacion.id);
      setSaliendo(null);
      if (conversacion.id === conversacionId) nuevaConversacion(true);
    });
  }

  return (
    <>
      <section aria-labelledby="titulo-conversaciones">
        <h2
          id="titulo-conversaciones"
          className="px-5 pt-3 pb-1 text-xs font-semibold tracking-wide text-tinta-suave uppercase"
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
          <ul className="space-y-0.5 px-2 pb-2" aria-busy={borrando}>
            {conversaciones.map((conversacion) => (
              <ItemDeConversacion
                key={conversacion.id}
                conversacion={conversacion}
                esLaActual={conversacion.id === conversacionId}
                seEstaPlegando={conversacion.id === saliendo}
                borrando={borrando}
                onAbrir={() => {
                  alElegir();
                  void abrirConversacion(conversacion.id);
                }}
                onPedirBorrar={() => setPorBorrar(conversacion)}
              />
            ))}
          </ul>
        )}
      </section>

      <DialogoDeConfirmacion
        abierto={porBorrar !== null}
        titulo="¿Borrar la conversación?"
        descripcion={`Se va a borrar «${porBorrar?.titulo ?? ""}» con todos sus mensajes. No se puede deshacer. Tus movimientos registrados no se tocan.`}
        textoConfirmar="Borrar"
        peligro
        onCancelar={() => setPorBorrar(null)}
        onConfirmar={() => porBorrar && borrarLaConversacion(porBorrar)}
      />
    </>
  );
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { lanzarSidebarSinProveedor } from "./erroresChat";
import { conActividad, conTitulo, sinConversacion, type EstadoSidebar, type ItemConversacion } from "./sidebar";

type ValorSidebar = EstadoSidebar & {
  /** Terminó una respuesta del asistente: la conversación sube arriba. */
  alTerminarRespuesta: (conversacion: ItemConversacion) => void;
  /** Se borró una conversación. */
  quitarConversacion: (id: string) => void;
  /** Una conversación tiene título nuevo. */
  cambiarTitulo: (id: string, titulo: string) => void;
};

const ContextoSidebar = createContext<ValorSidebar | null>(null);

/**
 * El estado del sidebar, compartido entre la lista (BarraLateral) y el chat (ChatWindow).
 * Arranca con lo que leyó la página de la base y después se actualiza con lo que pasa en el navegador (una respuesta
 * nueva, un título nuevo, una conversación borrada), sin volver a consultar ni recargar la página.
 */
export function ProveedorSidebar({ inicial, children }: { inicial: EstadoSidebar; children: ReactNode }) {
  const [estado, setEstado] = useState(inicial);

  const valor: ValorSidebar = {
    ...estado,
    alTerminarRespuesta: (conversacion) => setEstado((anterior) => conActividad(anterior, conversacion)),
    quitarConversacion: (id) => setEstado((anterior) => sinConversacion(anterior, id)),
    cambiarTitulo: (id, titulo) => setEstado((anterior) => conTitulo(anterior, id, titulo)),
  };

  return <ContextoSidebar.Provider value={valor}>{children}</ContextoSidebar.Provider>;
}

/** El estado del sidebar. Solo se puede usar adentro de <ProveedorSidebar>. */
export function useSidebar(): ValorSidebar {
  const valor = useContext(ContextoSidebar);
  return valor ?? lanzarSidebarSinProveedor();
}

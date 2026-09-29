"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { conActividad, sinConversacion, type EstadoSidebar, type ItemConversacion } from "./sidebar";

type ValorSidebar = EstadoSidebar & {
  /** Terminó una respuesta del asistente: la conversación sube arriba. */
  alTerminarRespuesta: (conversacion: ItemConversacion) => void;
  /** Se borró una conversación. */
  quitarConversacion: (id: string) => void;
};

const ContextoSidebar = createContext<ValorSidebar | null>(null);

/**
 * El estado del sidebar, compartido entre la lista (SidebarConversaciones) y el chat (ChatWindow).
 * Arranca con lo que leyó la página de la base y se actualiza con lo que pasa en el chat, sin volver a consultar.
 * La página le pone `key` con la conversación: al abrir otra, arranca de nuevo con los datos frescos.
 */
export function ProveedorSidebar({ inicial, children }: { inicial: EstadoSidebar; children: ReactNode }) {
  const [estado, setEstado] = useState(inicial);

  const valor: ValorSidebar = {
    ...estado,
    alTerminarRespuesta: (conversacion) => setEstado((anterior) => conActividad(anterior, conversacion)),
    quitarConversacion: (id) => setEstado((anterior) => sinConversacion(anterior, id)),
  };

  return <ContextoSidebar.Provider value={valor}>{children}</ContextoSidebar.Provider>;
}

/** El estado del sidebar. Solo se puede usar adentro de <ProveedorSidebar>. */
export function useSidebar(): ValorSidebar {
  const valor = useContext(ContextoSidebar);
  if (!valor) throw new Error("useSidebar se usa adentro de <ProveedorSidebar>.");
  return valor;
}

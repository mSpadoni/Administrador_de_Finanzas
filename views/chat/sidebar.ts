// Estado del sidebar (las conversaciones) y cómo cambia con lo que pasa en el chat.
// Funciones puras: el sidebar se actualiza con lo que el navegador ya sabe (el mensaje que mandó), sin volver a
// consultar la base. La página lo lee de la base una vez, al abrir cada conversación.

/** Lo que el costado necesita de cada conversación. */
export type ItemConversacion = { id: string; titulo: string };

export type EstadoSidebar = { conversaciones: ItemConversacion[] };

/** Hubo actividad en una conversación: pasa a estar arriba (si es nueva, se agrega con su título). */
export function conActividad(estado: EstadoSidebar, conversacion: ItemConversacion): EstadoSidebar {
  const existente = estado.conversaciones.find((item) => item.id === conversacion.id);
  const resto = estado.conversaciones.filter((item) => item.id !== conversacion.id);
  return { ...estado, conversaciones: [existente ?? conversacion, ...resto] };
}

/** Se borró una conversación: sale de la lista. */
export function sinConversacion(estado: EstadoSidebar, id: string): EstadoSidebar {
  return { conversaciones: estado.conversaciones.filter((conversacion) => conversacion.id !== id) };
}

// Cómo se cambia de conversación en el navegador: sin pedirle una página nueva al servidor (eso dejaba la pantalla en blanco
// un momento), se cambia la conversación en pantalla y se actualiza la dirección. Funciones puras. Las URLs están en
// src/shared/rutas.ts.

/** El id de una conversación nueva. Lo genera el navegador: la conversación existe en la base recién con el primer mensaje. */
export function nuevoIdDeConversacion(): string {
  return crypto.randomUUID();
}

/** ¿Es un click común? Con Ctrl, Cmd o Shift (o el botón del medio) la persona quiere abrir el link en otra pestaña. */
export function esClickComun(evento: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}) {
  return evento.button === 0 && !evento.metaKey && !evento.ctrlKey && !evento.shiftKey && !evento.altKey;
}

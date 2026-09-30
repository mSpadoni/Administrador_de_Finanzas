// Cómo se cambia de conversación en el navegador: sin pedirle una página nueva al servidor (eso dejaba la pantalla en blanco
// un momento), se cambia la conversación en pantalla y se actualiza la dirección. Funciones puras.

const PREFIJO_DE_LA_RUTA = "/conversacion/";

/** La dirección de una conversación: `/conversacion/<id>`. */
export function urlDeConversacion(id: string): string {
  return `${PREFIJO_DE_LA_RUTA}${id}`;
}

/** El id de conversación que hay en una dirección (`/conversacion/<uuid>`), o null si no es la de una conversación. */
export function idDeConversacionEnLaUrl(ruta: string): string | null {
  const coincidencia = new RegExp(`^${PREFIJO_DE_LA_RUTA}([0-9a-f-]{36})/?$`, "i").exec(ruta);
  return coincidencia?.[1] ?? null;
}

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

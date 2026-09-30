// Código compartido entre el servidor (backend/) y el navegador (views/): lógica pura, sin Next, Supabase ni SDKs.
// Así las dos puntas calculan lo mismo con la misma función (ESLint impide que acá se importe algo del servidor).

/** Largo máximo del título provisorio (el primer mensaje de la persona). */
export const MAX_CARACTERES_TITULO_PROVISORIO = 60;

/** Largo máximo del título que propone el asistente (entra en la barra lateral). */
export const MAX_CARACTERES_TITULO_DEL_ASISTENTE = 50;

/** El texto recortado a `maximo` caracteres, con «…» al final si se cortó. */
export function recortarConPuntosSuspensivos(texto: string, maximo: number): string {
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo - 1).trimEnd()}…`;
}

/**
 * El título de una conversación nueva: el primer mensaje del usuario, en una línea y recortado.
 * Lo usa el servidor al crear la conversación y el sidebar para mostrarla sin volver a consultar la base.
 */
export function tituloDesde(texto: string): string {
  const unaLinea = texto.replace(/\s+/g, " ").trim();
  return recortarConPuntosSuspensivos(unaLinea, MAX_CARACTERES_TITULO_PROVISORIO) || "Conversación nueva";
}

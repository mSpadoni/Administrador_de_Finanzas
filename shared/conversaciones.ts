// Código compartido entre el servidor (backend/) y el navegador (views/): lógica pura, sin Next, Supabase ni SDKs.
// Así las dos puntas calculan lo mismo con la misma función (ESLint impide que acá se importe algo del servidor).

/**
 * El título de una conversación nueva: el primer mensaje del usuario, en una línea y recortado.
 * Lo usa el servidor al crear la conversación y el sidebar para mostrarla sin volver a consultar la base.
 */
export function tituloDesde(texto: string): string {
  const unaLinea = texto.replace(/\s+/g, " ").trim();
  if (unaLinea.length <= 60) return unaLinea || "Conversación nueva";
  return `${unaLinea.slice(0, 59).trimEnd()}…`;
}

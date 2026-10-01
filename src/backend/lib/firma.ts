import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { envFirma } from "./env";

// La firma de las respuestas del asistente: un HMAC-SHA256 con una clave que solo conoce el servidor. Prueba que una
// respuesta guardada la escribió el servidor y no la persona (que puede insertar filas en sus conversaciones).
// Se firma el contenido en JSON canónico (claves ordenadas): la base (jsonb) no conserva el orden de las claves.

/** El valor en JSON con las claves de cada objeto ordenadas: el mismo dato da siempre el mismo texto. */
function jsonCanonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(",")}]`;
  if (valor !== null && typeof valor === "object") {
    const pares = Object.entries(valor)
      .filter(([, campo]) => campo !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([clave, campo]) => `${JSON.stringify(clave)}:${jsonCanonico(campo)}`);
    return `{${pares.join(",")}}`;
  }
  return JSON.stringify(valor);
}

/** Lo que se firma de un mensaje: a qué conversación pertenece, su id, su rol y sus partes. */
type ContenidoFirmado = { conversacionId: string; id: string; rol: string; partes: unknown };

/** La firma de un mensaje (base64url). */
export function firmar({ conversacionId, id, rol, partes }: ContenidoFirmado): string {
  return createHmac("sha256", envFirma().clave)
    .update(jsonCanonico([conversacionId, id, rol, partes]))
    .digest("base64url");
}

/** ¿La firma corresponde a ese mensaje? Compara en tiempo constante (no da pistas de cuánto acertó). */
export function firmaValida(contenido: ContenidoFirmado, firma: string | null): boolean {
  if (!firma) return false;
  const esperada = Buffer.from(firmar(contenido));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

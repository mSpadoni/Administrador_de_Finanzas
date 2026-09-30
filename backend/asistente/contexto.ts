import "server-only";
import type { AsistenteUIMessage } from "@/shared/chat";

// Qué parte de la conversación ve el modelo en cada respuesta. Lógica pura.

/** Un mensaje sin lo que usaron las tools: solo su texto. */
function soloTexto(mensaje: AsistenteUIMessage): AsistenteUIMessage {
  return { ...mensaje, parts: mensaje.parts.filter((parte) => parte.type === "text") };
}

/**
 * Lo que ve el modelo de la conversación. De la última respuesta del asistente va todo, con lo que devolvieron sus
 * tools: si la persona pregunta por lo que acaba de consultar ("¿y de eso cuánto fue en comida?"), los datos tienen
 * que seguir a mano. De las anteriores, solo el texto: las tools ocupan miles de tokens y, si las
 * necesita otra vez, el modelo vuelve a pedirlas. En la base se guarda todo, para mostrarlo al reabrir la conversación.
 */
export function mensajesParaElModelo(mensajes: AsistenteUIMessage[]): AsistenteUIMessage[] {
  const ultimaDelAsistente = mensajes.findLastIndex((mensaje) => mensaje.role === "assistant");
  return mensajes.map((mensaje, indice) => (indice === ultimaDelAsistente ? mensaje : soloTexto(mensaje)));
}

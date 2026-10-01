import "server-only";
import { isToolUIPart } from "ai";
import type { AsistenteUIMessage, ParteDelAsistente } from "@/shared/chat";

// Qué parte de la conversación ve el modelo en cada respuesta. Lógica pura.

/** Lo que queda del resultado de una tool que salió bien en una respuesta vieja: que salió bien, sin los datos. */
export const RESULTADO_RESUMIDO = {
  ok: true,
  resumen: "La herramienta se ejecutó bien. Sus datos ya no están a mano: si los necesitás, pedila de nuevo.",
} as const;

/**
 * Una parte de una respuesta vieja, achicada: el texto queda igual; una tool terminada queda con su llamada (nombre y
 * datos de entrada) y, si salió bien, con el resultado resumido (los fallos son cortos y quedan enteros). Lo demás (una
 * tool a medias, pasos de razonamiento) no se manda.
 */
function parteResumida(parte: ParteDelAsistente): ParteDelAsistente[] {
  if (parte.type === "text" || parte.type === "step-start") return [parte];
  if (!isToolUIPart(parte)) return [];
  if (parte.state === "output-error") return [parte];
  if (parte.state !== "output-available") return [];
  const salioBien = (parte.output as { ok?: unknown } | undefined)?.ok === true;
  if (!salioBien) return [parte];
  // El resumen no tiene la forma del resultado de la tool: el modelo solo lo lee como JSON, nadie más lo usa.
  return [{ ...parte, output: RESULTADO_RESUMIDO } as unknown as ParteDelAsistente];
}

function resumida(mensaje: AsistenteUIMessage): AsistenteUIMessage {
  return { ...mensaje, parts: mensaje.parts.flatMap(parteResumida) };
}

/**
 * Lo que ve el modelo de la conversación. De la última respuesta del asistente va todo, con lo que devolvieron sus
 * tools: si la persona pregunta por lo que acaba de consultar ("¿y de eso cuánto fue en comida?"), los datos tienen
 * que seguir a mano. De las anteriores, el texto y las llamadas a las tools, pero con los resultados resumidos: los
 * resultados completos ocupan miles de tokens y, si los necesita otra vez, el modelo vuelve a pedirlos.
 *
 * Las llamadas no se pueden sacar: si el modelo ve en su historial confirmaciones ("Listo: registré $ 85.000…") sin la
 * llamada a registrar_movimiento que las respaldó, aprende a confirmar sin llamar a la tool, y le dice a la persona que
 * guardó algo que no guardó. En la base se guarda todo, para mostrarlo al reabrir la conversación.
 */
export function mensajesParaElModelo(mensajes: AsistenteUIMessage[]): AsistenteUIMessage[] {
  const ultimaDelAsistente = mensajes.findLastIndex((mensaje) => mensaje.role === "assistant");
  return mensajes.map((mensaje, indice) =>
    indice === ultimaDelAsistente || mensaje.role !== "assistant" ? mensaje : resumida(mensaje)
  );
}

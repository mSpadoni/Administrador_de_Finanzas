import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { ToolsDelAsistente } from "@/backend/tools/asistente.tools";

// El contrato entre el navegador y /api/chat: límites y el tipo de los mensajes, en un solo lugar.
// El tipo de los mensajes se deriva de las tools del servidor (`import type`: no arrastra código al navegador),
// así la vista sabe exactamente qué datos y qué resultado tiene cada tool.

/** Largo máximo de un mensaje del usuario (lo valida el servidor y lo avisa el campo de texto). */
export const MAX_CARACTERES_MENSAJE = 6000;

/** Mensajes previos que se le pasan al modelo como contexto. */
export const MAX_MENSAJES_CONTEXTO = 20;

/** Cada tool del asistente con el tipo de sus datos (input) y de su resultado (output). */
export type HerramientasDelAsistente = InferUITools<ToolsDelAsistente>;

/** Los nombres de las tools del asistente ("registrar_movimiento", "cotizacion_dolar"…). */
export type NombreDeHerramienta = keyof HerramientasDelAsistente;

/**
 * Datos de cada respuesta del asistente para el panel de debug. Los manda el servidor mientras responde (el modelo al
 * empezar, los pasos a medida que pasan, los tokens y la demora al final). No se guardan en la base: al reabrir
 * una conversación, las respuestas viejas muestran sus tools pero no estos datos.
 */
export type MetadatosDeRespuesta = {
  modelo?: string;
  /** Rondas con el modelo: cada tool usada suma una, más la respuesta final. */
  pasos?: number;
  /** Demora total, desde el pedido hasta el último token (ms). */
  ms?: number;
  tokens?: { entrada?: number; salida?: number; total?: number };
  /** Por qué terminó: "stop" (normal), "length" (llegó al máximo de tokens), "tool-calls"... */
  motivoDeFin?: string;
};

/** Un mensaje del chat del asistente, con sus partes tipadas (texto, y cada tool con sus datos y resultado). */
export type AsistenteUIMessage = UIMessage<MetadatosDeRespuesta, UIDataTypes, HerramientasDelAsistente>;

/** Una parte de un mensaje del asistente. */
export type ParteDelAsistente = AsistenteUIMessage["parts"][number];

/** El texto de un mensaje (sus partes de texto, sin las tools), unidas con `separador`. */
export function textoDe(mensaje: Pick<AsistenteUIMessage, "parts">, separador = " "): string {
  return mensaje.parts.flatMap((parte) => (parte.type === "text" ? [parte.text] : [])).join(separador);
}

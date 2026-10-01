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

/** El resultado de una tool cuando salió bien (las que fallan devuelven `ok: false` y no se dibujan como tarjeta). */
export type ResultadoExitoso<N extends NombreDeHerramienta> = Extract<
  NonNullable<HerramientasDelAsistente[N]["output"]>,
  { ok: true }
>;

/** Las estadísticas de un período tal como las devuelve la tool `estadisticas` (también las usa el panel «Este mes»). */
export type EstadisticasDelPeriodo = ResultadoExitoso<"estadisticas">["estadisticas"];

/** Un movimiento guardado, tal como lo devuelven las tools. */
export type MovimientoGuardado = ResultadoExitoso<"registrar_movimiento">["movimiento"];

/** Cuánto tardó una tool en una respuesta (desde que el modelo la llamó hasta que devolvió su resultado). */
export type MedicionDeHerramienta = { id: string; nombre: string; ms: number };

/**
 * Lo que mide el servidor de cada respuesta del asistente y le manda al navegador mientras responde: el modelo al
 * empezar, cuánto tardó cada tool a medida que terminan, los tokens gastados al terminar cada paso y la demora total al
 * final. No se guarda en la base: al reabrir una conversación, las respuestas viejas muestran sus tools pero no esto.
 */
export type MetadatosDeRespuesta = {
  modelo?: string;
  /** Rondas con el modelo: cada tool usada suma una, más la respuesta final. */
  pasos?: number;
  /** Demora total, desde el pedido hasta el último token (ms). Solo está cuando la respuesta terminó. */
  ms?: number;
  /** Tokens gastados hasta ahora (entrada = el contexto que se le mandó al modelo, sumado de todos los pasos). */
  tokens?: { entrada?: number; salida?: number; total?: number };
  /** Las tools que ya terminaron, con lo que tardó cada una. */
  herramientas?: MedicionDeHerramienta[];
};

/** Un mensaje del chat del asistente, con sus partes tipadas (texto, y cada tool con sus datos y resultado). */
export type AsistenteUIMessage = UIMessage<MetadatosDeRespuesta, UIDataTypes, HerramientasDelAsistente>;

/** Una parte de un mensaje del asistente. */
export type ParteDelAsistente = AsistenteUIMessage["parts"][number];

/** El texto de un mensaje (sus partes de texto, sin las tools), unidas con `separador`. */
export function textoDe(mensaje: Pick<AsistenteUIMessage, "parts">, separador = " "): string {
  return mensaje.parts.flatMap((parte) => (parte.type === "text" ? [parte.text] : [])).join(separador);
}

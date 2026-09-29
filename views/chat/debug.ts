import { getStaticToolName, isStaticToolUIPart } from "ai";
import {
  textoDe,
  type HerramientasDelAsistente,
  type MetadatosDeRespuesta,
  type NombreDeHerramienta,
  type AsistenteUIMessage,
} from "@/shared/chat";
import { herramientaFallo, TEXTOS_DE_HERRAMIENTAS } from "./tipos";

// Qué muestra el panel de debug de cada respuesta del asistente: las tools que usó (con lo que les pasó y lo que
// devolvieron) y los datos del modelo (pasos, tokens, demora). Funciones puras: salen de los mensajes de useChat.

export type EstadoDeLlamada = "en curso" | "lista" | "con error";

export type LlamadaParaDebug = {
  id: string;
  /** El nombre técnico de la tool (ej. "verificar_fdp"). */
  herramienta: NombreDeHerramienta;
  /** En el vocabulario del usuario (ej. "Verificó la f.d.p."). */
  descripcion: string;
  estado: EstadoDeLlamada;
  /** Lo que le pasó el modelo, como JSON legible. */
  entrada: string;
  /** Lo que devolvió (o el error); null mientras se está usando. */
  salida: string | null;
};

export type RespuestaParaDebug = {
  id: string;
  /** Número de respuesta dentro de la conversación (1, 2, 3...). */
  numero: number;
  /** El mensaje del usuario que la pidió, recortado. */
  pedido: string;
  llamadas: LlamadaParaDebug[];
  metadatos: MetadatosDeRespuesta | undefined;
};

/** Largo máximo de cada entrada o salida en el panel: una lista de movimientos puede ocupar miles de caracteres. */
export const MAX_CARACTERES_EN_DEBUG = 1500;

/** Un valor como texto legible para el panel: JSON con sangría y lo muy largo recortado, avisando cuánto falta. */
export function comoTextoDeDebug(valor: unknown, max = MAX_CARACTERES_EN_DEBUG): string {
  const texto = typeof valor === "string" ? valor : (JSON.stringify(valor, null, 2) ?? String(valor));
  if (texto.length <= max) return texto;
  return `${texto.slice(0, max)}… (${texto.length - max} caracteres más)`;
}

/** Las respuestas del asistente en orden, cada una con el pedido del usuario, sus tools y los datos del modelo. */
export function respuestasParaDebug(mensajes: AsistenteUIMessage[]): RespuestaParaDebug[] {
  let pedido = "";
  let numero = 0;
  return mensajes.flatMap((mensaje) => {
    if (mensaje.role === "user") {
      pedido = textoDe(mensaje);
      return [];
    }
    if (mensaje.role !== "assistant") return [];
    numero += 1;
    const llamadas = mensaje.parts.filter(isStaticToolUIPart).map((parte): LlamadaParaDebug => {
      const herramienta = getStaticToolName<HerramientasDelAsistente>(parte);
      const estado: EstadoDeLlamada = herramientaFallo(parte)
        ? "con error"
        : parte.state === "output-available"
          ? "lista"
          : "en curso";
      const salida =
        parte.state === "output-available"
          ? comoTextoDeDebug(parte.output)
          : parte.state === "output-error"
            ? parte.errorText
            : null;
      return {
        id: parte.toolCallId,
        herramienta,
        descripcion: TEXTOS_DE_HERRAMIENTAS[herramienta].usada,
        estado,
        entrada: comoTextoDeDebug(parte.input ?? {}),
        salida,
      };
    });
    return [
      {
        id: mensaje.id,
        numero,
        pedido: comoTextoDeDebug(pedido, 120),
        llamadas,
        metadatos: mensaje.metadata,
      },
    ];
  });
}

/** Los tokens y la demora de toda la conversación abierta (solo de las respuestas que tienen esos datos). */
export function totalesDeDebug(respuestas: RespuestaParaDebug[]): { tokens: number; ms: number; llamadas: number } {
  return respuestas.reduce(
    (total, respuesta) => ({
      tokens: total.tokens + (respuesta.metadatos?.tokens?.total ?? 0),
      ms: total.ms + (respuesta.metadatos?.ms ?? 0),
      llamadas: total.llamadas + respuesta.llamadas.length,
    }),
    { tokens: 0, ms: 0, llamadas: 0 }
  );
}

import { getStaticToolName, isStaticToolUIPart } from "ai";
import { textoDe, type AsistenteUIMessage, type MetadatosDeRespuesta } from "@/shared/chat";
import { duracionDeLaTool } from "./actividad";
import { avisoDeHerramienta, herramientaFallo } from "./tipos";

// Lo que muestra el panel de debug: por cada respuesta del asistente, qué decidió hacer el modelo (qué herramientas usó
// y con qué datos), qué devolvieron, cuánto tardó y cuántos tokens gastó. Funciones puras, sin dibujar nada.

/** Cuántos caracteres se muestran como máximo de un dato de una tool (los resultados pueden ser enormes). */
export const MAX_CARACTERES_EN_DEBUG = 1500;

/** Un dato como texto legible: JSON con sangría, o el texto tal cual; si es largo, se corta y se dice cuánto falta. */
export function comoTextoDeDebug(valor: unknown, max = MAX_CARACTERES_EN_DEBUG): string {
  const texto = typeof valor === "string" ? valor : (JSON.stringify(valor, null, 2) ?? String(valor));
  return texto.length <= max ? texto : `${texto.slice(0, max)}… (${texto.length - max} caracteres más)`;
}

/** Una tool que usó el modelo en una respuesta. */
export type HerramientaDeDebug = {
  id: string;
  /** El nombre técnico, tal cual lo llama el modelo (`cotizacion_dolar`). */
  nombre: string;
  /** Lo que se le dice a la persona («Consultó la cotización del dólar · 0,8 s»). */
  texto: string;
  /** Lo que decidió el modelo pasarle (los argumentos de la tool). */
  entrada: string;
  /** Lo que devolvió; undefined si todavía no terminó. */
  salida: string | undefined;
  fallo: boolean;
  ms: number | undefined;
};

/** Una respuesta del asistente, con lo que hizo. */
export type RespuestaDeDebug = {
  id: string;
  /** Lo que pidió la persona (su último mensaje antes de esta respuesta), recortado. */
  pedido: string;
  herramientas: HerramientaDeDebug[];
  /** Modelo, pasos, tokens y demora, si el servidor los midió (no se guardan: las respuestas viejas no los tienen). */
  metadatos: MetadatosDeRespuesta | undefined;
};

function salidaDeLaTool(
  parte: Extract<AsistenteUIMessage["parts"][number], { toolCallId: string }>
): string | undefined {
  if (parte.state === "output-available") return comoTextoDeDebug(parte.output);
  if (parte.state === "output-error") return parte.errorText;
  return undefined;
}

/** Las respuestas del asistente de la conversación, en orden, cada una con su pedido y sus herramientas. */
export function respuestasParaDebug(mensajes: AsistenteUIMessage[]): RespuestaDeDebug[] {
  const respuestas: RespuestaDeDebug[] = [];
  let pedido = "";
  for (const mensaje of mensajes) {
    if (mensaje.role === "user") {
      pedido = comoTextoDeDebug(textoDe(mensaje), 120);
      continue;
    }
    const herramientas = mensaje.parts.filter(isStaticToolUIPart).map((parte) => {
      const ms = duracionDeLaTool(mensaje.metadata, parte.toolCallId);
      return {
        id: parte.toolCallId,
        nombre: getStaticToolName(parte),
        texto: avisoDeHerramienta(parte, ms)?.texto ?? getStaticToolName(parte),
        entrada: comoTextoDeDebug(parte.input ?? {}),
        salida: salidaDeLaTool(parte),
        fallo: herramientaFallo(parte),
        ms,
      };
    });
    respuestas.push({ id: mensaje.id, pedido, herramientas, metadatos: mensaje.metadata });
  }
  return respuestas;
}

/** Los totales de toda la conversación (solo cuentan las respuestas medidas). */
export type TotalesDeDebug = {
  respuestas: number;
  herramientas: number;
  ms: number;
  tokens: { entrada: number; salida: number; total: number };
};

export function totalesDeDebug(respuestas: RespuestaDeDebug[]): TotalesDeDebug {
  const totales: TotalesDeDebug = {
    respuestas: respuestas.length,
    herramientas: 0,
    ms: 0,
    tokens: { entrada: 0, salida: 0, total: 0 },
  };
  for (const { herramientas, metadatos } of respuestas) {
    totales.herramientas += herramientas.length;
    totales.ms += metadatos?.ms ?? 0;
    totales.tokens.entrada += metadatos?.tokens?.entrada ?? 0;
    totales.tokens.salida += metadatos?.tokens?.salida ?? 0;
    totales.tokens.total += metadatos?.tokens?.total ?? 0;
  }
  return totales;
}

import "server-only";
import { randomUUID } from "node:crypto";
import {
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  streamText,
  type LanguageModel,
  type TextStreamPart,
  type ToolSet,
} from "ai";
import { armarSystemPrompt } from "@/backend/lib/prompts/systemPrompt";
import { hoyEnArgentina } from "@/backend/models/dominio/periodo";
import type { ToolsDelAsistente } from "@/backend/tools/asistente.tools";
import { textoDeErrorEnStream, timeoutComoError, traducirError } from "@/backend/asistente/errores";
import type { MetadatosDeRespuesta, AsistenteUIMessage } from "@/shared/chat";

// El agente: todo lo que tiene que ver con el LLM (prompt, tools, pasos, streaming, log).
// No sabe de conversaciones ni de la base: recibe los mensajes y avisa cuando termina la respuesta.

/**
 * Máximo de pasos por respuesta: varias rondas de tools y la respuesta final. Un pedido puede usar varias (ej.
 * cotización del dólar, registrar el gasto y después las estadísticas del mes). Evita loops sin fin.
 */
const MAXIMO_DE_PASOS = 8;

/** Tokens de salida por paso: alcanza de sobra para una respuesta con tablas y los datos de las tools. */
export const MAXIMO_TOKENS_DE_SALIDA = 4000;

/**
 * El modelo manda el texto en ráfagas irregulares; así la respuesta se lee más cómoda: sale palabra por palabra,
 * a un ritmo parejo (~30 palabras por segundo).
 */
export const PAUSA_ENTRE_PALABRAS_MS = 30;

/** Cómo responde el asistente: se configura una vez, al crear el agente. */
export type ConfiguracionDelAgente = {
  /** Cuánto puede tardar una respuesta completa (ms). */
  timeoutMs?: number;
  /** Pausa entre palabras al mostrar la respuesta (ms). 0 = tan rápido como llega del modelo. */
  pausaEntrePalabrasMs?: number;
  /** Temperatura del modelo (0 = lo más predecible). Sin valor, la del proveedor. Las evals usan 0. */
  temperatura?: number;
};

/** Lo que cambia en cada respuesta: el modelo, la conversación, las tools del pedido y qué hacer al terminar. */
export type PedidoAlAgente = {
  modelo: LanguageModel;
  /** La conversación hasta ahora, con el mensaje nuevo del usuario al final. */
  mensajes: AsistenteUIMessage[];
  tools: ToolsDelAsistente;
  /** Se llama con la respuesta completa del asistente (o lo que llegó si el usuario la cortó). */
  alTerminar: (respuesta: AsistenteUIMessage) => Promise<void>;
};

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

/** El nombre del modelo configurado (el SDK acepta un string o un objeto de modelo). */
function nombreDelModelo(modelo: LanguageModel): string {
  return typeof modelo === "string" ? modelo : modelo.modelId;
}

/**
 * Arma los datos del panel de debug a medida que pasa el stream: el modelo al empezar, el número de paso al
 * terminar cada uno (con el modelo exacto que respondió) y, al final, los tokens, la demora y el motivo de fin.
 * El navegador junta todo en `message.metadata`.
 */
export function medidorDeRespuesta(modelo: string, inicio = Date.now()) {
  let pasos = 0;
  return (parte: TextStreamPart<ToolSet>): MetadatosDeRespuesta | undefined => {
    switch (parte.type) {
      case "start":
        return { modelo };
      case "finish-step":
        pasos += 1;
        return { pasos, modelo: parte.response.modelId || modelo };
      case "finish":
        return {
          ms: Date.now() - inicio,
          motivoDeFin: parte.finishReason,
          tokens: {
            entrada: parte.totalUsage.inputTokens,
            salida: parte.totalUsage.outputTokens,
            total: parte.totalUsage.totalTokens,
          },
        };
      default:
        return undefined;
    }
  };
}

/**
 * El agente del asistente: todo lo que tiene que ver con el LLM (prompt, tools, pasos, streaming, log).
 * Es una clase porque su configuración (timeout, ritmo del texto) se fija una vez y la usan todas las respuestas;
 * no sabe de conversaciones ni de la base: recibe los mensajes y avisa cuando termina la respuesta.
 */
export class Agente {
  private readonly timeoutMs: number;
  private readonly pausaEntrePalabrasMs: number;
  private readonly temperatura: number | undefined;

  constructor({
    timeoutMs = 45_000,
    pausaEntrePalabrasMs = PAUSA_ENTRE_PALABRAS_MS,
    temperatura,
  }: ConfiguracionDelAgente = {}) {
    this.timeoutMs = timeoutMs;
    this.pausaEntrePalabrasMs = pausaEntrePalabrasMs;
    this.temperatura = temperatura;
  }

  /**
   * Le pide la respuesta al modelo y la devuelve como stream de partes (el formato que entiende useChat).
   * El modelo decide qué tools usar según lo que pide el usuario: acá no se elige por él.
   * Si el modelo falla en el medio, el error llega dentro del stream con su código.
   */
  async responder({ modelo, mensajes, tools, alTerminar }: PedidoAlAgente) {
    const { timeoutMs, pausaEntrePalabrasMs, temperatura } = this;
    const inicio = Date.now();
    const medir = medidorDeRespuesta(nombreDelModelo(modelo), inicio);
    const resultado = streamText({
      model: modelo,
      system: armarSystemPrompt(hoyEnArgentina(new Date())),
      // Con las tools, cada resultado anterior se le pasa al modelo como lo define la tool. Una tool que quedó a medias (el usuario cortó la respuesta) no se manda.
      messages: await convertToModelMessages(mensajesParaElModelo(mensajes), {
        tools,
        ignoreIncompleteToolCalls: true,
      }),
      tools,
      toolChoice: "auto", // el modelo decide si usa tools y cuáles
      stopWhen: stepCountIs(MAXIMO_DE_PASOS),
      // Por paso: pone un techo al gasto de cada respuesta.
      maxOutputTokens: MAXIMO_TOKENS_DE_SALIDA,
      maxRetries: 1,
      temperature: temperatura,
      timeout: timeoutMs,
      // Palabra por palabra, con una pausa pareja entre cada una.
      experimental_transform: smoothStream({ delayInMs: pausaEntrePalabrasMs, chunking: "word" }),
      onFinish: ({ steps, totalUsage }) => {
        // Log en formato JSON con datos útiles de cada respuesta (demora, pasos, tokens, tools usadas).
        const herramientas = steps.flatMap((paso) =>
          paso.toolCalls.map((llamada) => ({ nombre: llamada.toolName, entrada: llamada.input }))
        );
        console.info(
          JSON.stringify({
            evento: "chat.respuesta",
            ms: Date.now() - inicio,
            pasos: steps.length,
            tokens: totalUsage.totalTokens,
            herramientas,
          })
        );
      },
    });

    return resultado
      .toUIMessageStream<AsistenteUIMessage>({
        originalMessages: mensajes,
        generateMessageId: randomUUID,
        // Modelo, pasos, tokens y demora de esta respuesta, para el panel de debug.
        messageMetadata: ({ part }) => medir(part),
        onFinish: async ({ responseMessage }) => {
          if (responseMessage.parts.length > 0) await alTerminar(responseMessage);
        },
        // Cualquier error del modelo llega al usuario con su código y un mensaje entendible, sin detalles técnicos.
        // El original (con el cuerpo de la respuesta de OpenAI) va solo al log del servidor.
        onError: (error) => {
          const traducido = traducirError(error);
          console.error(`Error en el stream del asistente (${traducido.codigo}):`, error);
          return textoDeErrorEnStream(traducido);
        },
      })
      .pipeThrough(timeoutComoError<MetadatosDeRespuesta>());
  }
}

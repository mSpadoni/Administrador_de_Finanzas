import "server-only";
import { randomUUID } from "node:crypto";
import {
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  streamText,
  type LanguageModel,
  type LanguageModelUsage,
  type StepResult,
} from "ai";
import { armarSystemPrompt } from "@/backend/asistente/systemPrompt";
import { registrarError, registrarEvento } from "@/backend/lib/registro";
import { hoyEnArgentina } from "@/backend/models/dominio/periodo";
import type { ToolsDelAsistente } from "@/backend/tools/asistente.tools";
import { traducirError } from "@/backend/asistente/erroresAsistente";
import type { AsistenteUIMessage, MetadatosDeRespuesta } from "@/shared/chat";
import { mensajesParaElModelo } from "./contexto";
import { medidorDeRespuesta } from "./medicion";
import { textoDeErrorEnStream, timeoutComoError } from "./streams";

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
 * a un ritmo parejo (~20 palabras por segundo).
 */
export const PAUSA_ENTRE_PALABRAS_MS = 50;

/** Cuánto puede tardar una respuesta completa si no se configura otra cosa (ms). */
const TIMEOUT_DEL_AGENTE_MS = 45_000;

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

/** El nombre del modelo configurado (el SDK acepta un string o un objeto de modelo). */
function nombreDelModelo(modelo: LanguageModel): string {
  return typeof modelo === "string" ? modelo : modelo.modelId;
}

/** Una línea de log en JSON con datos útiles de cada respuesta (demora, pasos, tokens, tools usadas). */
function registrarRespuesta(pasos: StepResult<ToolsDelAsistente>[], uso: LanguageModelUsage, inicio: number): void {
  const herramientas = pasos.flatMap((paso) =>
    paso.toolCalls.map((llamada) => ({ nombre: llamada.toolName, entrada: llamada.input }))
  );
  registrarEvento("chat.respuesta", {
    ms: Date.now() - inicio,
    pasos: pasos.length,
    tokens: uso.totalTokens,
    herramientas,
  });
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
    timeoutMs = TIMEOUT_DEL_AGENTE_MS,
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
  async responder(pedido: PedidoAlAgente) {
    const inicio = Date.now();
    const respuestaDelModelo = await this.pedirAlModelo(pedido, inicio);
    return this.comoStreamDeMensajes(respuestaDelModelo, pedido, inicio);
  }

  /** Paso 1: le manda al modelo la conversación y las tools, con los límites (pasos, tokens, tiempo) configurados. */
  private async pedirAlModelo({ modelo, mensajes, tools }: PedidoAlAgente, inicio: number) {
    return streamText({
      model: modelo,
      system: armarSystemPrompt(hoyEnArgentina(new Date())),
      // Con las tools, cada resultado anterior se le pasa al modelo como lo define la tool. Una tool que quedó a medias
      // (el usuario cortó la respuesta) no se manda.
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
      temperature: this.temperatura,
      timeout: this.timeoutMs,
      // Palabra por palabra, con una pausa pareja entre cada una.
      experimental_transform: smoothStream({ delayInMs: this.pausaEntrePalabrasMs, chunking: "word" }),
      onFinish: ({ steps, totalUsage }) => registrarRespuesta(steps, totalUsage, inicio),
    });
  }

  /** Paso 2: convierte lo que responde el modelo en mensajes para el navegador, con sus errores traducidos. */
  private comoStreamDeMensajes(
    respuestaDelModelo: Awaited<ReturnType<Agente["pedirAlModelo"]>>,
    { modelo, mensajes, alTerminar }: PedidoAlAgente,
    inicio: number
  ) {
    const medir = medidorDeRespuesta(nombreDelModelo(modelo), inicio);
    return respuestaDelModelo
      .toUIMessageStream<AsistenteUIMessage>({
        originalMessages: mensajes,
        generateMessageId: randomUUID,
        // Modelo, tools, tokens y demora de esta respuesta, para mostrarlos.
        messageMetadata: ({ part }) => medir(part),
        onFinish: async ({ responseMessage }) => {
          if (responseMessage.parts.length > 0) await alTerminar(responseMessage);
        },
        // Cualquier error del modelo llega al usuario con su código y un mensaje entendible, sin detalles técnicos.
        // El original (con el cuerpo de la respuesta de OpenAI) va solo al log del servidor.
        onError: (error) => {
          const traducido = traducirError(error);
          registrarError("asistente.stream", error, { codigo: traducido.codigo });
          return textoDeErrorEnStream(traducido);
        },
      })
      .pipeThrough(timeoutComoError<MetadatosDeRespuesta>());
  }
}

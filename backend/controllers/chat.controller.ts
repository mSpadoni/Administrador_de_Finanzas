import "server-only";
import type { InferUIMessageChunk, LanguageModel } from "ai";
import { crearModeloOpenAI } from "@/backend/lib/openai";
import { LIMITES_DE_USO, limiteAlcanzado, type LimitesDeUso } from "@/backend/models/dominio/limiteDeUso";
import { conversacionesModel, type ConversacionesModel } from "@/backend/models/repositorios/conversaciones.model";
import { crearToolsAsistente } from "@/backend/tools/asistente.tools";
import { Agente } from "@/backend/asistente/agente";
import { MAX_MENSAJES_CONTEXTO, type AsistenteUIMessage } from "@/shared/chat";
import { tituloDesde } from "@/shared/conversaciones";
import { lanzarErrorDelModelo, lanzarLimiteAlcanzado, lanzarPorFalloAlCrearConversacion } from "./erroresControllers";
import { movimientosController, type MovimientosController } from "./movimientos.controller";
import { validarPedidoDeChat, type PedidoDeChat } from "./validacionControllers";

/**
 * Lo que se le puede pasar al ChatController para reemplazar sus piezas (útil en los tests).
 * Todas llevan `?`: son opcionales y, si no se pasan, se usan las reales.
 */
type Dependencias = {
  /** Crea el modelo de lenguaje (OpenAI): distinto de los modelos de datos, que hablan con la base. */
  crearModelo?: () => LanguageModel;
  modeloConversaciones?: () => ConversacionesModel;
  /** El controller que ejecutan las tools de movimientos (con la sesión del pedido). */
  movimientos?: () => MovimientosController;
  timeoutMs?: number;
  /** Pausa entre palabras al mostrar la respuesta (ms). 0 = tan rápido como llega del modelo. */
  pausaEntrePalabrasMs?: number;
  /** Temperatura del modelo (ver Agente). */
  temperatura?: number;
  /** Cuántos mensajes puede mandar un usuario por minuto y por día. */
  limites?: LimitesDeUso;
};

/**
 * Responde un mensaje del usuario en streaming: lee el historial de la base, guarda el mensaje nuevo, le pasa
 * todo al agente (backend/asistente/agente.ts) y, cuando la respuesta termina, la guarda.
 * Lo del LLM (prompt, tools, streaming) está en el agente; lo que ve el usuario si falla, en backend/asistente/erroresAsistente.ts.
 */
export class ChatController {
  private readonly crearModelo: () => LanguageModel;
  private readonly modeloConversaciones: () => ConversacionesModel;
  private readonly movimientos: () => MovimientosController;
  private readonly agente: Agente;
  private readonly limites: LimitesDeUso;

  // Recibe UN objeto y lo desestructura en el momento: cada propiedad con su valor por defecto (`= ...`).
  // `: Dependencias = {}` → el objeto entero es opcional: `new ChatController()` usa todo lo real.
  constructor({
    crearModelo = () => crearModeloOpenAI(),
    modeloConversaciones = () => conversacionesModel,
    movimientos = () => movimientosController,
    timeoutMs,
    pausaEntrePalabrasMs,
    temperatura,
    limites = LIMITES_DE_USO,
  }: Dependencias = {}) {
    this.crearModelo = crearModelo;
    this.modeloConversaciones = modeloConversaciones;
    this.movimientos = movimientos;
    // El agente se configura una vez (timeout y ritmo del texto); sin valores, usa los suyos.
    this.agente = new Agente({ timeoutMs, pausaEntrePalabrasMs, temperatura });
    this.limites = limites;
  }

  /**
   * Devuelve la respuesta del asistente como stream de partes (lo que entiende useChat); la ruta la convierte en HTTP.
   * Si algo falla antes de empezar (límite de uso, conversación de otro usuario) tira un ErrorDeAplicacion; si la
   * base no responde, el error de Supabase sigue de largo (la ruta lo responde como error interno).
   * Si falla el modelo en el medio, el error llega dentro del stream, con su código.
   */
  async responder(cuerpo: unknown): Promise<ReadableStream<InferUIMessageChunk<AsistenteUIMessage>>> {
    // Lo que manda el navegador se valida primero: si no es válido, se corta acá (pedido_invalido).
    const pedido = validarPedidoDeChat(cuerpo);
    // El modelo de lenguaje primero: si falta configuración (ej. OPENAI_API_KEY), se corta antes de guardar nada.
    const modelo = this.crearModeloOCortar();
    await this.verificarLimiteDeUso();
    await this.asegurarConversacion(pedido);
    const historial = await this.leerHistorialSinElMensaje(pedido);
    await this.modeloConversaciones().agregarMensajes(pedido.conversacionId, [pedido.mensaje]);

    return this.agente.responder({
      modelo,
      mensajes: [...historial, pedido.mensaje],
      tools: crearToolsAsistente({ movimientos: this.movimientos() }),
      alTerminar: (respuesta) => this.guardarRespuesta(pedido.conversacionId, respuesta),
    });
  }

  /** Crea el modelo de lenguaje; si no se puede, corta con el mensaje de siempre en vez de un 500 genérico. */
  private crearModeloOCortar(): LanguageModel {
    try {
      return this.crearModelo();
    } catch (error) {
      return lanzarErrorDelModelo(error);
    }
  }

  /** El límite de uso: cada mensaje gasta crédito. Se revisa antes de guardar nada. */
  private async verificarLimiteDeUso(): Promise<void> {
    const limite = limiteAlcanzado(await this.modeloConversaciones().usoReciente(), this.limites);
    if (limite) lanzarLimiteAlcanzado(limite);
  }

  /** La conversación: si es nueva, se crea con el primer mensaje como título. */
  private async asegurarConversacion({ conversacionId, texto }: PedidoDeChat): Promise<void> {
    const conversaciones = this.modeloConversaciones();
    if (await conversaciones.obtener(conversacionId)) return;
    // Si falla porque el id ya existe, es de otro usuario (RLS no se la deja ver); cualquier otra falla sigue de largo.
    await conversaciones.crear(conversacionId, tituloDesde(texto)).catch(lanzarPorFalloAlCrearConversacion);
  }

  /** El historial (sin el mensaje nuevo, por si es un reintento y ya estaba guardado). */
  private async leerHistorialSinElMensaje({ conversacionId, mensaje }: PedidoDeChat): Promise<AsistenteUIMessage[]> {
    const mensajes = await this.modeloConversaciones().mensajes(conversacionId, MAX_MENSAJES_CONTEXTO);
    return mensajes.filter((anterior) => anterior.id !== mensaje.id);
  }

  /** Guarda la respuesta del asistente al terminar (o si el usuario la corta). Si falla, solo queda en el log. */
  private guardarRespuesta(conversacionId: string, respuesta: AsistenteUIMessage): Promise<void> {
    return this.modeloConversaciones()
      .agregarMensajes(conversacionId, [respuesta])
      .catch((error: unknown) => {
        console.error("No se pudo guardar la respuesta del asistente:", error);
      });
  }
}

/** Instancia única lista para usar desde la ruta /api/chat. */
export const chatController = new ChatController();

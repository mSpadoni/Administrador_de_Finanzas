import "server-only";
import { safeValidateUIMessages, type InferUIMessageChunk, type LanguageModel } from "ai";
import { crearModeloOpenAI } from "@/backend/lib/openai";
import { registrarError } from "@/backend/lib/registro";
import { LIMITES_DE_USO, limiteAlcanzado, type LimitesDeUso } from "@/backend/models/dominio/limiteDeUso";
import { conversacionesModel, type ConversacionesModel } from "@/backend/models/repositorios/conversaciones.model";
import { usoModel, type UsoModel } from "@/backend/models/repositorios/uso.model";
import { ConversacionYaExisteError } from "@/backend/models/repositorios/erroresRepositorios";
import { crearToolsAsistente, type ToolsDelAsistente } from "@/backend/tools/asistente.tools";
import { Agente } from "@/backend/asistente/agente";
import { MAX_MENSAJES_CONTEXTO, type AsistenteUIMessage } from "@/shared/chat";
import { tituloDesde } from "@/shared/conversaciones";
import { lanzarErrorDelModelo, lanzarLimiteAlcanzado, lanzarPorFalloAlCrearConversacion } from "./erroresControllers";
import { movimientosServicio, type MovimientosServicio } from "@/backend/servicios/movimientos.servicio";
import { validarPedidoDeChat, type PedidoDeChat } from "./validacionControllers";

/**
 * Lo que se le puede pasar al ChatController para reemplazar sus piezas (útil en los tests).
 * Todas llevan `?`: son opcionales y, si no se pasan, se usan las reales.
 */
type Dependencias = {
  /** Crea el modelo de lenguaje (OpenAI): distinto de los modelos de datos, que hablan con la base. */
  crearModelo?: () => LanguageModel;
  modeloConversaciones?: () => ConversacionesModel;
  /** La cuota de uso del asistente (cuántos mensajes por minuto y por día). */
  modeloUso?: () => UsoModel;
  /** El controller que ejecutan las tools de movimientos (con la sesión del pedido). */
  movimientos?: () => MovimientosServicio;
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
  private readonly modeloUso: () => UsoModel;
  private readonly movimientos: () => MovimientosServicio;
  private readonly agente: Agente;
  private readonly limites: LimitesDeUso;

  // Recibe UN objeto y lo desestructura en el momento: cada propiedad con su valor por defecto (`= ...`).
  // `: Dependencias = {}` → el objeto entero es opcional: `new ChatController()` usa todo lo real.
  constructor({
    crearModelo = () => crearModeloOpenAI(),
    modeloConversaciones = () => conversacionesModel,
    modeloUso = () => usoModel,
    movimientos = () => movimientosServicio,
    timeoutMs,
    pausaEntrePalabrasMs,
    temperatura,
    limites = LIMITES_DE_USO,
  }: Dependencias = {}) {
    this.crearModelo = crearModelo;
    this.modeloConversaciones = modeloConversaciones;
    this.modeloUso = modeloUso;
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
    const tools = crearToolsAsistente({ movimientos: this.movimientos() });
    const conversacion = await this.conversacionParaElModelo(pedido, tools);
    await this.modeloConversaciones().agregarMensajes(pedido.conversacionId, [pedido.mensaje]);

    return this.agente.responder({
      modelo,
      mensajes: conversacion,
      tools,
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
    const limite = limiteAlcanzado(await this.modeloUso().consumir("mensaje", this.limites), this.limites);
    if (limite) lanzarLimiteAlcanzado(limite);
  }

  /** La conversación: si es nueva, se crea con el primer mensaje como título. */
  private async asegurarConversacion({ conversacionId, texto }: PedidoDeChat): Promise<void> {
    const conversaciones = this.modeloConversaciones();
    if (await conversaciones.obtener(conversacionId)) return;
    try {
      await conversaciones.crear(conversacionId, tituloDesde(texto));
    } catch (error) {
      if (await this.laCreoOtroEnvio(error, conversacionId)) return;
      // El id ya existe y no se ve: es de otro usuario (RLS la oculta). Cualquier otra falla sigue de largo.
      lanzarPorFalloAlCrearConversacion(error);
    }
  }

  /**
   * ¿La conversación ya existía porque otro envío de la misma persona la creó recién (ej. un doble envío del primer
   * mensaje)? En ese caso ahora sí se ve y se sigue normalmente.
   */
  private async laCreoOtroEnvio(error: unknown, conversacionId: string): Promise<boolean> {
    return (
      error instanceof ConversacionYaExisteError && (await this.modeloConversaciones().obtener(conversacionId)) !== null
    );
  }

  /**
   * La conversación que ve el modelo: lo guardado y el mensaje nuevo al final. En un reintento el mensaje ya estaba
   * guardado: queda en su lugar, con lo que el asistente haya alcanzado a responder después. Así el modelo no lo lee como
   * un pedido nuevo ni repite lo que ya hizo (por ejemplo, registrar dos veces el mismo gasto).
   * Solo va lo confiable: las respuestas del asistente que escribió el servidor (firmadas) y, de todo, lo que tiene la forma
   * que espera el AI SDK.
   */
  private async conversacionParaElModelo(
    { conversacionId, mensaje }: PedidoDeChat,
    tools: ToolsDelAsistente
  ): Promise<AsistenteUIMessage[]> {
    const confiables = await this.modeloConversaciones().mensajesConfiables(conversacionId, MAX_MENSAJES_CONTEXTO);
    const guardados = await soloLosBienFormados(confiables, tools);
    return guardados.some((guardado) => guardado.id === mensaje.id) ? guardados : [...guardados, mensaje];
  }

  /** Guarda la respuesta del asistente al terminar (o si el usuario la corta). Si falla, solo queda en el log. */
  private guardarRespuesta(conversacionId: string, respuesta: AsistenteUIMessage): Promise<void> {
    return this.modeloConversaciones()
      .agregarMensajes(conversacionId, [respuesta])
      .catch((error: unknown) => {
        registrarError("chat.guardar_respuesta", error);
      });
  }
}

/**
 * Los mensajes con la forma que espera el AI SDK (texto, y cada tool con datos que pasan su inputSchema). Un mensaje roto
 * (una fila vieja o cargada a mano) no le llega al modelo, en vez de romper la respuesta entera.
 */
async function soloLosBienFormados(
  mensajes: AsistenteUIMessage[],
  tools: ToolsDelAsistente
): Promise<AsistenteUIMessage[]> {
  const validos = await Promise.all(
    mensajes.map(async (mensaje) => (await safeValidateUIMessages({ messages: [mensaje], tools })).success)
  );
  return mensajes.filter((_, indice) => validos[indice]);
}

/** Instancia única lista para usar desde la ruta /api/chat. */
export const chatController = new ChatController();

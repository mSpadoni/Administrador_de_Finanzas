import "server-only";
import type { LanguageModel } from "ai";
import type { AsistenteUIMessage } from "@/shared/chat";
import { MAX_MENSAJES_PARA_TITULAR, titulador as tituladorDeLaApp, type Titulador } from "@/backend/asistente/titulador";
import { crearModeloOpenAI } from "@/backend/lib/openai";
import {
  conversacionesModel,
  type ConversacionesModel,
  type ConversacionGuardada,
} from "@/backend/models/repositorios/conversaciones.model";
import { esIdDeConversacion } from "./validacionControllers";

/** Una conversación abierta: sus datos (null si todavía no se guardó ningún mensaje) y su historial. */
export type ConversacionAbierta = { conversacion: ConversacionGuardada | null; mensajes: AsistenteUIMessage[] };

const SIN_CONVERSACION: ConversacionAbierta = { conversacion: null, mensajes: [] };

/**
 * Casos de uso de las conversaciones del usuario: la lista del costado, abrir una, borrarla y ponerle título.
 * Todo pasa por el model con la sesión del usuario, así que RLS limita a sus propias conversaciones.
 * El id viene del navegador (la URL o el botón de borrar): se valida antes de llegar al model.
 */
export class ConversacionesController {
  // Convención de todos los controllers: el modelo se llama `modelo<Entidad>` (modeloConversaciones, modeloMovimientos, modeloAuth).
  constructor(
    private readonly modeloConversaciones: () => ConversacionesModel = () => conversacionesModel,
    private readonly titulador: Titulador = tituladorDeLaApp,
    /** Crea el modelo de lenguaje con el que se pone título (los tests le pasan uno de prueba). */
    private readonly crearModelo: () => LanguageModel = () => crearModeloOpenAI()
  ) {}

  /** Las conversaciones del usuario para el costado, la más reciente arriba. */
  listar(): Promise<ConversacionGuardada[]> {
    return this.modeloConversaciones().listar();
  }

  /**
   * Abre una conversación. Si no existe (es nueva, o es de otro usuario y RLS la oculta) o el id no es válido,
   * devuelve `conversacion: null` y sin mensajes: el chat arranca vacío y se guarda con el primer mensaje.
   */
  async abrir(id: unknown): Promise<ConversacionAbierta> {
    if (!esIdDeConversacion(id)) return SIN_CONVERSACION;
    const conversacion = await this.modeloConversaciones().obtener(id);
    if (!conversacion) return SIN_CONVERSACION;
    return { conversacion, mensajes: await this.modeloConversaciones().mensajes(id) };
  }

  /**
   * Le pone (o le actualiza) el título a la conversación según lo que se habló, con el modelo: así el título dice de qué
   * trata en vez de repetir el primer mensaje, y cambia si la charla cambia de tema. Devuelve el título que quedó, o
   * `null` si no se pudo (id inválido, conversación ajena o sin respuesta del asistente todavía, o el modelo falló):
   * ponerle título es un extra y nunca corta la conversación.
   */
  async retitular(id: unknown): Promise<string | null> {
    if (!esIdDeConversacion(id)) return null;
    const conversacion = await this.modeloConversaciones().obtener(id);
    if (!conversacion) return null;
    const mensajes = await this.modeloConversaciones().mensajes(id, MAX_MENSAJES_PARA_TITULAR);
    // Hasta que el asistente no respondió no hay de qué hablar: alcanza con el título provisional.
    if (!mensajes.some((mensaje) => mensaje.role === "assistant")) return null;

    let modelo: LanguageModel;
    try {
      modelo = this.crearModelo();
    } catch (error) {
      console.error("No se pudo crear el modelo para titular la conversación:", error);
      return null;
    }
    const titulo = await this.titulador.proponer({ modelo, tituloActual: conversacion.titulo, mensajes });
    if (!titulo) return null;
    if (titulo !== conversacion.titulo) await this.modeloConversaciones().actualizarTitulo(id, titulo);
    return titulo;
  }

  /** Borra una conversación del usuario. Devuelve false si el id no es válido, no existía o no era suya. */
  borrar(id: unknown): Promise<boolean> {
    if (!esIdDeConversacion(id)) return Promise.resolve(false);
    return this.modeloConversaciones().borrar(id);
  }
}

/** Instancia lista para usar desde las páginas y server actions. */
export const conversacionesController = new ConversacionesController();

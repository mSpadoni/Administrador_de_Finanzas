import "server-only";
import type { LanguageModel } from "ai";
import type { AsistenteUIMessage } from "@/shared/chat";
import {
  MAX_MENSAJES_PARA_TITULAR,
  titulador as tituladorDeLaApp,
  type Titulador,
} from "@/backend/asistente/titulador";
import { crearModeloOpenAI } from "@/backend/lib/openai";
import { LIMITES_DE_USO, type LimitesDeUso } from "@/backend/models/dominio/limiteDeUso";
import { usoModel, type UsoModel } from "@/backend/models/repositorios/uso.model";
import { registrarError } from "@/backend/lib/registro";
import {
  conversacionesModel,
  type ConversacionesModel,
  type ConversacionGuardada,
} from "@/backend/models/repositorios/conversaciones.model";

/** Una conversación abierta: sus datos (null si todavía no se guardó ningún mensaje) y su historial. */
export type ConversacionAbierta = { conversacion: ConversacionGuardada | null; mensajes: AsistenteUIMessage[] };

export const SIN_CONVERSACION: ConversacionAbierta = { conversacion: null, mensajes: [] };

/**
 * Las conversaciones del usuario: la lista del costado, abrir una, borrarla y ponerle título. Lo usan la página de una
 * conversación (vía PantallaController) y las Server Actions (vía ConversacionesController): por eso es un servicio.
 * Todo pasa por el model con la sesión del usuario, así que RLS limita a sus propias conversaciones. Recibe ids ya
 * validados: lo que manda el navegador lo valida el controller (o la página) antes de llegar acá.
 */
export class ConversacionesServicio {
  // Convención de controllers y servicios: el modelo se llama `modelo<Entidad>` (modeloConversaciones, modeloMovimientos, modeloAuth).
  constructor(
    private readonly modeloConversaciones: () => ConversacionesModel = () => conversacionesModel,
    private readonly titulador: Titulador = tituladorDeLaApp,
    /** Crea el modelo de lenguaje con el que se pone título (los tests le pasan uno de prueba). */
    private readonly crearModelo: () => LanguageModel = () => crearModeloOpenAI(),
    /** La cuota de uso: ponerle título también gasta crédito, así que tiene su propio límite. */
    private readonly modeloUso: () => UsoModel = () => usoModel,
    private readonly limites: LimitesDeUso = LIMITES_DE_USO
  ) {}

  /** Las conversaciones del usuario para el costado, la más reciente arriba. */
  listar(): Promise<ConversacionGuardada[]> {
    return this.modeloConversaciones().listar();
  }

  /**
   * Abre una conversación. Si no existe (es nueva, o es de otro usuario y RLS la oculta), devuelve
   * `conversacion: null` y sin mensajes: el chat arranca vacío y se guarda con el primer mensaje.
   */
  async abrir(id: string): Promise<ConversacionAbierta> {
    const conversacion = await this.modeloConversaciones().obtener(id);
    if (!conversacion) return SIN_CONVERSACION;
    return { conversacion, mensajes: await this.modeloConversaciones().mensajes(id) };
  }

  /**
   * Le pone (o le actualiza) el título a la conversación según lo que se habló, con el modelo: así el título dice de qué
   * trata en vez de repetir el primer mensaje, y cambia si la charla cambia de tema. Devuelve el título que quedó, o
   * `null` si no se pudo (conversación ajena o sin respuesta del asistente todavía, o el modelo falló): ponerle título
   * es un extra y nunca corta la conversación.
   */
  async retitular(id: string): Promise<string | null> {
    const paraTitular = await this.leerParaTitular(id);
    if (!paraTitular) return null;
    // Si se pasó de la cuota de títulos, se queda el que había: el título es un extra.
    if (await this.modeloUso().consumir("titulo", this.limites)) return null;
    const modelo = this.crearModeloParaTitular();
    if (!modelo) return null;

    const { conversacion, mensajes } = paraTitular;
    const titulo = await this.titulador.proponer({ modelo, tituloActual: conversacion.titulo, mensajes });
    if (!titulo) return null;
    if (titulo !== conversacion.titulo) await this.modeloConversaciones().actualizarTitulo(id, titulo);
    return titulo;
  }

  /**
   * La conversación con los últimos mensajes, si ya hay de qué hablar; `null` si no existe (o es de otro usuario) o si el
   * asistente todavía no respondió: hasta entonces alcanza con el título provisional.
   */
  private async leerParaTitular(id: string) {
    const conversacion = await this.modeloConversaciones().obtener(id);
    if (!conversacion) return null;
    const mensajes = await this.modeloConversaciones().mensajes(id, MAX_MENSAJES_PARA_TITULAR);
    if (!mensajes.some((mensaje) => mensaje.role === "assistant")) return null;
    return { conversacion, mensajes };
  }

  /** El modelo con el que se pone el título, o `null` si no se pudo crear (ej. falta la clave): el título es un extra. */
  private crearModeloParaTitular(): LanguageModel | null {
    try {
      return this.crearModelo();
    } catch (error) {
      registrarError("titulador.crear_modelo", error);
      return null;
    }
  }

  /** Borra una conversación del usuario. Devuelve false si no existía o no era suya. */
  borrar(id: string): Promise<boolean> {
    return this.modeloConversaciones().borrar(id);
  }
}

/** Instancia lista para usar desde los controllers. */
export const conversacionesServicio = new ConversacionesServicio();

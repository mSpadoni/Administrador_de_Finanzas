import "server-only";
import type { AsistenteUIMessage } from "@/shared/chat";
import {
  conversacionesModel,
  type ConversacionesModel,
  type ConversacionGuardada,
} from "@/backend/models/repositorios/conversaciones.model";
import { esIdDeConversacion } from "./validaciones";

/** Una conversación abierta: sus datos (null si todavía no se guardó ningún mensaje) y su historial. */
export type ConversacionAbierta = { conversacion: ConversacionGuardada | null; mensajes: AsistenteUIMessage[] };

const SIN_CONVERSACION: ConversacionAbierta = { conversacion: null, mensajes: [] };

/**
 * Casos de uso de las conversaciones del usuario: la lista del costado, abrir una y borrarla.
 * Todo pasa por el model con la sesión del usuario, así que RLS limita a sus propias conversaciones.
 * El id viene del navegador (la URL o el botón de borrar): se valida antes de llegar al model.
 */
export class ConversacionesController {
  constructor(private readonly conversaciones: () => ConversacionesModel = () => conversacionesModel) {}

  /** Las conversaciones del usuario para el costado, la más reciente arriba. */
  listar(): Promise<ConversacionGuardada[]> {
    return this.conversaciones().listar();
  }

  /**
   * Abre una conversación. Si no existe (es nueva, o es de otro usuario y RLS la oculta) o el id no es válido,
   * devuelve `conversacion: null` y sin mensajes: el chat arranca vacío y se guarda con el primer mensaje.
   */
  async abrir(id: unknown): Promise<ConversacionAbierta> {
    if (!esIdDeConversacion(id)) return SIN_CONVERSACION;
    const conversacion = await this.conversaciones().obtener(id);
    if (!conversacion) return SIN_CONVERSACION;
    return { conversacion, mensajes: await this.conversaciones().mensajes(id) };
  }

  /** Borra una conversación del usuario. Devuelve false si el id no es válido, no existía o no era suya. */
  borrar(id: unknown): Promise<boolean> {
    if (!esIdDeConversacion(id)) return Promise.resolve(false);
    return this.conversaciones().borrar(id);
  }
}

/** Instancia lista para usar desde las páginas y server actions. */
export const conversacionesController = new ConversacionesController();

import "server-only";
import {
  conversacionesServicio,
  SIN_CONVERSACION,
  type ConversacionAbierta,
  type ConversacionesServicio,
} from "@/backend/servicios/conversaciones.servicio";
import { esIdDeConversacion } from "./validacionControllers";

/**
 * Lo que piden las Server Actions de una conversación (src/app/conversacion/actions.ts): abrirla, borrarla y ponerle
 * título. El id viene del navegador (la URL o el botón de borrar), así que se valida acá: uno que no es un UUID no llega
 * al servicio. Lo demás lo hace ConversacionesServicio, el mismo que usa la página (vía PantallaController).
 */
export class ConversacionesController {
  constructor(private readonly servicio: () => ConversacionesServicio = () => conversacionesServicio) {}

  /** Abre una conversación; con un id inválido, vacía (como una que todavía no existe). */
  abrir(id: unknown): Promise<ConversacionAbierta> {
    return esIdDeConversacion(id) ? this.servicio().abrir(id) : Promise.resolve(SIN_CONVERSACION);
  }

  /** Le pone título según lo que se habló; con un id inválido, `null` (se queda el título que había). */
  retitular(id: unknown): Promise<string | null> {
    return esIdDeConversacion(id) ? this.servicio().retitular(id) : Promise.resolve(null);
  }

  /** Borra una conversación; con un id inválido, `false`. */
  borrar(id: unknown): Promise<boolean> {
    return esIdDeConversacion(id) ? this.servicio().borrar(id) : Promise.resolve(false);
  }
}

/** Instancia lista para usar desde las Server Actions. */
export const conversacionesController = new ConversacionesController();

// "use server": las funciones de este archivo son Server Actions (corren en el servidor aunque las dispare un botón).
"use server";

import { conversacionesController } from "@/backend/controllers/conversaciones.controller";
import { registrarError } from "@/backend/lib/registro";
import type { AsistenteUIMessage } from "@/shared/chat";

/** Borra una conversación del usuario logueado (RLS impide borrar las de otro). */
export async function borrarConversacion(id: string): Promise<void> {
  await conversacionesController.borrar(id);
}

/**
 * Le pone título a una conversación según lo que se habló (o le actualiza el que tiene) y devuelve el título nuevo, o null si
 * no se pudo. Es un extra: cualquier falla se traga y se queda el título anterior.
 */
export async function retitularConversacion(id: string): Promise<string | null> {
  try {
    return await conversacionesController.retitular(id);
  } catch (error) {
    registrarError("conversaciones.retitular", error);
    return null;
  }
}

/** Lee el historial de una conversación del usuario logueado (vacío si no existe o es de otro: RLS no se la deja ver). */
export async function leerConversacion(id: string): Promise<AsistenteUIMessage[]> {
  return (await conversacionesController.abrir(id)).mensajes;
}

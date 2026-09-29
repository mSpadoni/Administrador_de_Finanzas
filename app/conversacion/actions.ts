// "use server": las funciones de este archivo son Server Actions (corren en el servidor aunque las dispare un botón).
"use server";

import { conversacionesController } from "@/backend/controllers/conversaciones.controller";

/** Borra una conversación del usuario logueado (RLS impide borrar las de otro). */
export async function borrarConversacion(id: string): Promise<void> {
  await conversacionesController.borrar(id);
}

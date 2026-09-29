import { notFound, redirect } from "next/navigation";
import { cerrarSesion } from "@/app/auth/actions";
import { borrarConversacion } from "@/app/conversacion/actions";
import { authController } from "@/backend/controllers/auth.controller";
import { conversacionesController } from "@/backend/controllers/conversaciones.controller";
import { esIdDeConversacion } from "@/backend/controllers/validaciones";
import PantallaDeChat from "@/views/chat/PantallaDeChat";

/** En Next 15 los parámetros de la URL llegan como Promise: `/conversacion/abc` → `{ id: "abc" }`. */
type Props = { params: Promise<{ id: string }> };

/**
 * Página de una conversación. Lee de la base, una sola vez, el historial y la lista del costado;
 * a partir de ahí el chat mantiene la conversación en el navegador.
 * Si la conversación todavía no existe, arranca vacía: se guarda con el primer mensaje.
 */
export default async function PaginaConversacion({ params }: Props) {
  const usuario = await authController.obtenerUsuarioActual();
  if (!usuario) redirect("/");

  const { id } = await params;
  if (!esIdDeConversacion(id)) notFound();

  // Promise.all: las dos lecturas a la vez, no una después de la otra.
  const [conversaciones, abierta] = await Promise.all([
    conversacionesController.listar(),
    conversacionesController.abrir(id),
  ]);

  return (
    <PantallaDeChat
      usuario={usuario}
      conversaciones={conversaciones.map(({ id, titulo }) => ({ id, titulo }))}
      conversacionId={id}
      mensajesIniciales={abierta.mensajes}
      cerrarSesion={cerrarSesion}
      borrarConversacion={borrarConversacion}
    />
  );
}

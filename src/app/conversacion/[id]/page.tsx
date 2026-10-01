import { notFound, redirect } from "next/navigation";
import { cerrarSesion } from "@/app/auth/actions";
import { borrarConversacion, leerConversacion, retitularConversacion } from "@/app/conversacion/actions";
import { authController } from "@/backend/controllers/auth.controller";
import { pantallaController } from "@/backend/controllers/pantalla.controller";
import { esIdDeConversacion } from "@/backend/controllers/validacionControllers";
import PantallaDeChat from "@/frontend/chat/PantallaDeChat";
import { RUTAS } from "@/shared/rutas";

/** En Next 15 los parámetros de la URL llegan como Promise: `/conversacion/abc` → `{ id: "abc" }`. */
type Props = { params: Promise<{ id: string }> };

/**
 * Página de una conversación. Lee de la base, una sola vez, el historial y la lista del costado;
 * a partir de ahí el chat mantiene la conversación en el navegador.
 * Si la conversación todavía no existe, arranca vacía: se guarda con el primer mensaje.
 */
export default async function PaginaConversacion({ params }: Props) {
  const usuario = await authController.obtenerUsuarioActual();
  if (!usuario) redirect(RUTAS.inicio);

  const { id } = await params;
  if (!esIdDeConversacion(id)) notFound();

  const { conversaciones, mensajes, estadisticasDelMes } = await pantallaController.abrir(id);

  return (
    <PantallaDeChat
      usuario={usuario}
      conversaciones={conversaciones}
      conversacionId={id}
      mensajesIniciales={mensajes}
      estadisticasDelMes={estadisticasDelMes}
      cerrarSesion={cerrarSesion}
      borrarConversacion={borrarConversacion}
      leerConversacion={leerConversacion}
      retitularConversacion={retitularConversacion}
    />
  );
}

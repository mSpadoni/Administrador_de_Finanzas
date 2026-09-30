import { notFound, redirect } from "next/navigation";
import { cerrarSesion } from "@/app/auth/actions";
import { borrarConversacion, leerConversacion, retitularConversacion } from "@/app/conversacion/actions";
import { authController } from "@/backend/controllers/auth.controller";
import { conversacionesController } from "@/backend/controllers/conversaciones.controller";
import { movimientosController } from "@/backend/controllers/movimientos.controller";
import { esIdDeConversacion } from "@/backend/controllers/validacionControllers";
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
  const [conversaciones, abierta, estadisticasDelMes] = await Promise.all([
    conversacionesController.listar(),
    conversacionesController.abrir(id),
    // Si el resumen del mes falla, el chat sigue funcionando: el panel avisa que no pudo cargarlo.
    movimientosController.estadisticasDelMes().catch((error: unknown) => {
      console.error("No se pudo leer el resumen del mes", error);
      return null;
    }),
  ]);

  // `.map` arma una lista nueva con lo que devuelve la función para cada conversación. Acá se queda solo con `id` y
  // `titulo`, que es lo único que necesita el costado: el resto de las columnas (fechas de creación y de última
  // actividad) no viajan al navegador.
  const paraElCostado = conversaciones.map(({ id, titulo }) => ({ id, titulo }));

  return (
    <PantallaDeChat
      usuario={usuario}
      conversaciones={paraElCostado}
      conversacionId={id}
      mensajesIniciales={abierta.mensajes}
      estadisticasDelMes={estadisticasDelMes}
      cerrarSesion={cerrarSesion}
      borrarConversacion={borrarConversacion}
      leerConversacion={leerConversacion}
      retitularConversacion={retitularConversacion}
    />
  );
}

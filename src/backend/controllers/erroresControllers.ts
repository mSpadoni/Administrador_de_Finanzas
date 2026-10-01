import "server-only";
import { ErrorDeAplicacion } from "@/backend/erroresBackend";
import { ConversacionYaExisteError } from "@/backend/models/repositorios/erroresRepositorios";
import type { LimiteAlcanzado } from "@/backend/models/dominio/limiteDeUso";

// Todos los errores de backend/controllers: los que cortan un pedido (se lanzan y la ruta los responde con su código).
// Los fallos de los servicios de movimientos (que no se lanzan) están en servicios/erroresServicios.ts.

/** Lo que manda el navegador no pasó su esquema: la ruta responde 400 (pedido_invalido). */
export function lanzarPedidoInvalido(mensaje: string): never {
  throw new ErrorDeAplicacion("pedido_invalido", mensaje);
}

/** La persona ya llegó a su límite de mensajes (por minuto o por día). */
export function lanzarLimiteAlcanzado(limite: LimiteAlcanzado): never {
  throw new ErrorDeAplicacion(limite.codigo, limite.mensaje);
}

/**
 * No se pudo crear la conversación. Si es porque ese id ya existe, pero la persona no la ve, es de otra persona (RLS se la
 * oculta): se responde como conversación no encontrada. Cualquier otra falla (la base caída, un bug) sigue de largo como
 * estaba, para que la ruta la responda como error interno en vez de mentir con un 404. `causa`: el error original.
 */
export function lanzarPorFalloAlCrearConversacion(causa: unknown): never {
  if (!(causa instanceof ConversacionYaExisteError)) throw causa;
  throw new ErrorDeAplicacion("conversacion_no_encontrada", "No encontramos esa conversación. Empezá una nueva.", {
    cause: causa,
  });
}

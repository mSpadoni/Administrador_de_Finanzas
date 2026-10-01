import "server-only";
import { traducirError } from "@/backend/asistente/erroresAsistente";
import { ErrorDeAplicacion } from "@/backend/erroresBackend";
import type { MotivoDelDolar } from "@/backend/lib/dolar/erroresDolar";
import { fallo, type Fallo } from "@/backend/lib/erroresLib";
import { ErrorDeDominio } from "@/backend/models/dominio/erroresDominio";
import { ConversacionYaExisteError } from "@/backend/models/repositorios/erroresRepositorios";
import type { LimiteAlcanzado } from "@/backend/models/dominio/limiteDeUso";

// Todos los errores de backend/controllers: los que cortan un caso de uso (se lanzan, la ruta los responde con su
// código) y los fallos de los casos de uso de movimientos (no se lanzan: se devuelven como `{ ok: false, motivo,
// detalle }` para que el asistente se los explique a la persona).

/** Lo que manda el navegador no pasó su esquema: la ruta responde 400 (pedido_invalido). */
export function lanzarPedidoInvalido(mensaje: string): never {
  throw new ErrorDeAplicacion("pedido_invalido", mensaje);
}

/** El modelo de lenguaje no se pudo crear (ej. falta OPENAI_API_KEY): se corta con el error traducido, sin guardar nada. */
export function lanzarErrorDelModelo(error: unknown): never {
  throw traducirError(error);
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

/** Por qué un caso de uso de movimientos no pudo hacer lo que se le pidió (un fallo de la cotización o un dato mal pedido). */
export type FalloDeMovimientos = Fallo<MotivoDelDolar | "datos_invalidos" | "no_encontrado">;

export const datosInvalidos = (detalle: string): FalloDeMovimientos => fallo("datos_invalidos", detalle);

/**
 * Por qué no se pudo armar el período pedido. Solo el rango al revés (un error del dominio) es un dato mal pedido; cualquier
 * otro error es un bug y sigue de largo.
 */
export function falloDelPeriodoPedido(error: unknown): FalloDeMovimientos {
  if (error instanceof ErrorDeDominio) return datosInvalidos(error.message);
  throw error;
}

export const movimientoNoEncontrado = (): FalloDeMovimientos =>
  fallo("no_encontrado", "No hay un movimiento tuyo con ese id.");

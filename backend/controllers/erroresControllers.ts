import "server-only";
import { traducirError } from "@/backend/asistente/erroresAsistente";
import { ErrorDeAplicacion } from "@/backend/erroresBackend";
import type { MotivoError } from "@/backend/lib/erroresLib";
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

/** La conversación no existe o es de otra persona (RLS no se la deja ver). `causa`: el error original, para el log. */
export function lanzarConversacionNoEncontrada(causa: unknown): never {
  throw new ErrorDeAplicacion("conversacion_no_encontrada", "No encontramos esa conversación. Empezá una nueva.", {
    cause: causa,
  });
}

/** Por qué un caso de uso de movimientos no pudo hacer lo que se le pidió. */
export type FalloDeMovimientos = {
  ok: false;
  motivo: MotivoError | "datos_invalidos" | "no_encontrado";
  detalle: string;
};

export const datosInvalidos = (detalle: string): FalloDeMovimientos => ({
  ok: false,
  motivo: "datos_invalidos",
  detalle,
});

export const movimientoNoEncontrado = (): FalloDeMovimientos => ({
  ok: false,
  motivo: "no_encontrado",
  detalle: "No hay un movimiento tuyo con ese id.",
});

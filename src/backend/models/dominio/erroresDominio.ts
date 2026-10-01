// Todos los errores de backend/models/dominio. Son errores de quien llama (un dato que el dominio nunca debería recibir):
// los servicios validan antes, así que llegar hasta acá es un bug o un pedido mal armado, no algo de la persona.

/** Un pedido que rompe una regla del dominio (un período al revés, un monto en dólares sin cotización…). */
export class ErrorDeDominio extends Error {
  override name = "ErrorDeDominio";
}

/** Un movimiento en pesos no se pasa a pesos: no lleva cotización. */
export function lanzarCotizacionEnUnMovimientoEnPesos(): never {
  throw new ErrorDeDominio("Un movimiento en pesos no lleva cotización.");
}

/** Un movimiento en dólares no se puede pasar a pesos sin la cotización. */
export function lanzarMovimientoEnDolaresSinCotizacion(): never {
  throw new ErrorDeDominio("Un movimiento en dólares necesita la cotización con la que se pasa a pesos.");
}

/** Un rango de días que termina antes de empezar. */
export function lanzarPeriodoAlReves(desde: string, hasta: string): never {
  throw new ErrorDeDominio(`El período termina (${hasta}) antes de empezar (${desde}).`);
}

/**
 * Un período con «hasta» pero sin «desde»: no se adivina desde cuándo. El mensaje le dice al asistente qué preguntar (y
 * que ofrezca «desde hoy», así la persona no tiene que decir una fecha).
 */
export function lanzarPeriodoSinDesde(): never {
  throw new ErrorDeDominio(
    "Falta desde cuándo. Preguntale a la persona desde qué día quiere ver y ofrecele «desde hoy» para que no tenga que decir una fecha."
  );
}

/** Datos de un movimiento que no son válidos, en un lugar donde ya tendrían que haber llegado validados. */
export function lanzarMovimientoInvalido(detalle: string): never {
  throw new ErrorDeDominio(`Movimiento inválido: ${detalle}`);
}

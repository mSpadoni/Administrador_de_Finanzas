// El contrato de errores entre el servidor y el navegador. El navegador decide qué hacer según el CÓDIGO (estable,
// para máquina), nunca según el texto: el mensaje es solo para mostrarle al usuario y puede cambiar.

export const CODIGOS_DE_ERROR = [
  "no_autenticado", // la sesión venció o no hay sesión
  "pedido_invalido", // el cuerpo del pedido no pasó la validación
  "conversacion_no_encontrada", // no existe, o es de otro usuario (RLS no la deja ver)
  "limite_por_minuto", // demasiados mensajes seguidos
  "limite_por_dia", // llegó al máximo del día
  "asistente_saturado", // OpenAI respondió 429 (sin ser falta de saldo) o 5xx: pasajero
  "asistente_demorado", // se venció el timeout de la respuesta
  "asistente_no_disponible", // configuración: clave inválida, sin saldo, modelo inexistente, variable faltante
  "error_interno", // cualquier otro error del servidor (el detalle queda solo en el log)
  "sin_conexion", // lo genera el navegador: el pedido no llegó al servidor
] as const;

export type CodigoDeError = (typeof CODIGOS_DE_ERROR)[number];

/** Lo único de un error que llega al navegador: el código y un mensaje pensado para el usuario. */
export type ErrorPublico = { codigo: CodigoDeError; mensaje: string };

/**
 * El cuerpo de las respuestas de error de la API. Es también el texto de un error que llega en el medio del
 * stream del chat, así el navegador lee los dos casos igual.
 */
export type CuerpoDeError = { error: ErrorPublico };

/** ¿Tiene sentido ofrecer "Reintentar"? (Con la sesión vencida o el límite del día, reintentar no cambia nada.) */
export const SE_PUEDE_REINTENTAR: Record<CodigoDeError, boolean> = {
  no_autenticado: false,
  pedido_invalido: false,
  conversacion_no_encontrada: false,
  limite_por_minuto: true,
  limite_por_dia: false,
  asistente_saturado: true,
  asistente_demorado: true,
  asistente_no_disponible: true,
  error_interno: true,
  sin_conexion: true,
};

function esCodigoDeError(valor: unknown): valor is CodigoDeError {
  return typeof valor === "string" && (CODIGOS_DE_ERROR as readonly string[]).includes(valor);
}

/** Lee un CuerpoDeError de un texto (el cuerpo de una respuesta o el texto de error del stream), o null si no es uno. */
export function leerErrorPublico(texto: string): ErrorPublico | null {
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return null;
  }
  if (typeof cuerpo !== "object" || cuerpo === null || !("error" in cuerpo)) return null;
  const error: unknown = cuerpo.error;
  if (typeof error !== "object" || error === null || !("codigo" in error) || !("mensaje" in error)) return null;
  return esCodigoDeError(error.codigo) && typeof error.mensaje === "string"
    ? { codigo: error.codigo, mensaje: error.mensaje }
    : null;
}

import { NextResponse } from "next/server";
import { ErrorDeAplicacion } from "@/backend/erroresBackend";
import { registrarError } from "@/backend/lib/registro";
import type { CodigoDeError, CuerpoDeError, ErrorPublico } from "@/shared/erroresShared";

// El único lugar que traduce un error de la app a HTTP. El backend no conoce los status; acá se decide también
// qué se loguea. Al navegador llega solo { error: { codigo, mensaje } }: nunca el error original.

/** El status HTTP de cada código. `Record` obliga a que cada código nuevo tenga el suyo (si no, no compila). */
const STATUS_POR_CODIGO: Record<CodigoDeError, number> = {
  no_autenticado: 401,
  pedido_invalido: 400,
  conversacion_no_encontrada: 404,
  limite_por_minuto: 429,
  limite_por_dia: 429,
  asistente_saturado: 503,
  asistente_demorado: 504,
  asistente_no_disponible: 502,
  error_interno: 500,
  sin_conexion: 503, // lo genera el navegador; está por completitud
};

const ERROR_INTERNO: ErrorPublico = { codigo: "error_interno", mensaje: "Algo falló de nuestro lado. Probá de nuevo." };

/** Una respuesta JSON de error con el código, el mensaje para el usuario y el status que le corresponde. */
export function respuestaDeErrorPublico(publico: ErrorPublico): NextResponse<CuerpoDeError> {
  const cuerpo: CuerpoDeError = { error: publico };
  return NextResponse.json(cuerpo, {
    status: STATUS_POR_CODIGO[publico.codigo],
    // 429 por minuto: le dice al cliente cuánto esperar (estándar HTTP).
    headers: publico.codigo === "limite_por_minuto" ? { "Retry-After": "60" } : undefined,
  });
}

/**
 * La respuesta para un error que llegó hasta la ruta. Un ErrorDeAplicacion se responde con su código; cualquier
 * otro (Supabase caído, un bug) es un error interno: se loguea completo y al usuario le llega el mensaje genérico.
 */
export function respuestaDeError(error: unknown): NextResponse<CuerpoDeError> {
  registrarFalla(error);
  return respuestaDeErrorPublico(error instanceof ErrorDeAplicacion ? error.publico : ERROR_INTERNO);
}

/** Deja en el log lo que conviene ver: los errores inesperados y los del asistente (con su causa). */
function registrarFalla(error: unknown): void {
  if (!(error instanceof ErrorDeAplicacion)) return registrarError("error_inesperado", error);
  // Los esperables (límite, sesión) no son fallas del servidor; los del asistente sí conviene verlos con su causa.
  if (error.codigo.startsWith("asistente_")) {
    registrarError("asistente.error", error.cause ?? error, { codigo: error.codigo });
  }
}

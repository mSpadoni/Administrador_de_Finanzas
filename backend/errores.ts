import type { CodigoDeError, ErrorPublico } from "@/shared/errores";

/**
 * Un error que la app conoce: tiene un código estable, un mensaje para el usuario y, en `cause`, el error original
 * (de Supabase, OpenAI, dolarapi...) para los logs. No sabe de HTTP: el código se traduce a status en la ruta
 * (app/api/respuestaDeError.ts). Una sola clase con un código, en vez de una clase por caso: alcanza para
 * distinguirlos y el compilador controla que cada código tenga su status.
 */
export class ErrorDeAplicacion extends Error {
  constructor(
    readonly codigo: CodigoDeError,
    readonly mensajePublico: string,
    options?: { cause?: unknown }
  ) {
    super(`${codigo}: ${mensajePublico}`, options);
    this.name = "ErrorDeAplicacion";
  }

  /** Lo que puede ver el navegador (sin `cause` ni stack). */
  get publico(): ErrorPublico {
    return { codigo: this.codigo, mensaje: this.mensajePublico };
  }
}

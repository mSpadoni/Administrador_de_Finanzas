// Los errores de backend/lib: las variables de entorno mal configuradas (se lanzan) y la forma de los fallos que no se
// lanzan (`{ ok: false, motivo, detalle }`: el asistente se los explica a la persona; cada servicio define sus motivos, ej.
// dolar/erroresDolar.ts). No lleva `server-only` porque env.ts también lo usa el middleware (Edge).

/** Falta una variable de entorno o tiene un valor inválido. El mensaje dice cuál y dónde verlo. */
export class ErrorDeConfiguracion extends Error {
  override name = "ErrorDeConfiguracion";
}

/** Corta con un solo error que junta todos los problemas de la configuración de un servicio. */
export function lanzarConfiguracionIncompleta(servicio: string, problemas: string): never {
  throw new ErrorDeConfiguracion(`Configuración de ${servicio} incompleta: ${problemas} (ver .env.example).`);
}

/**
 * Por qué un caso de uso o un servicio no pudo hacer lo que se le pidió, sin lanzar: el motivo (para el código) y el detalle
 * (para explicárselo a la persona). Quien lo devuelve nunca lanza por esto: así el asistente lo corrige o lo explica.
 */
export type Fallo<Motivo extends string> = { ok: false; motivo: Motivo; detalle: string };

/**
 * El resultado de algo que puede fallar sin lanzar: o salió bien (`ok: true` más sus datos) o es un fallo. `F` es el tipo
 * de fallo de quien lo devuelve.
 */
export type Resultado<Datos extends object, F extends Fallo<string>> = ({ ok: true } & Datos) | F;

/** Arma un fallo (todos los fallos de la app tienen esta forma). */
export const fallo = <Motivo extends string>(motivo: Motivo, detalle: string): Fallo<Motivo> => ({
  ok: false,
  motivo,
  detalle,
});

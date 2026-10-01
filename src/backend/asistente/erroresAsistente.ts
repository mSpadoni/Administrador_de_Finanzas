import "server-only";
import { APICallError, RetryError } from "ai";
import { ErrorDeAplicacion } from "@/backend/erroresBackend";
import type { CodigoDeError } from "@/shared/erroresShared";

// Los errores del modelo (OpenAI, AI SDK) traducidos a errores de la app: un código estable y un mensaje para el
// usuario. Lo usan el controller (antes de empezar el stream) y el agente (en el medio del stream; cómo viaja el error por
// el stream está en streams.ts).
// Acá no se loguea: lo hace quien maneja el error (la ruta, o el onError del stream), una sola vez.

/** Lo que ve el usuario cuando el modelo tarda demasiado. */
const MENSAJE_TIMEOUT = "El asistente tardó demasiado en responder. Probá de nuevo en unos segundos.";

/**
 * Todos los errores del modelo que la app distingue, cada uno con su código y su mensaje. Para agregar uno nuevo se
 * suma una entrada acá y, si hace falta reconocerlo, una regla en RECONOCEDORES.
 */
const ERRORES_DEL_ASISTENTE = {
  demorado: { codigo: "asistente_demorado", mensaje: MENSAJE_TIMEOUT },
  demasiadasConsultas: {
    codigo: "asistente_saturado",
    mensaje: "El asistente está recibiendo demasiadas consultas. Esperá un minuto y volvé a intentar.",
  },
  proveedorSaturado: {
    codigo: "asistente_saturado",
    mensaje: "El asistente está saturado en este momento. Esperá un minuto y volvé a intentar.",
  },
  // Clave inválida, sin permisos, modelo inexistente, sin crédito, variable faltante: es un problema de
  // configuración, no del usuario. Es también el motivo de todo error que no se reconoce.
  noDisponible: {
    codigo: "asistente_no_disponible",
    mensaje:
      "El asistente no está disponible en este momento. Probá de nuevo más tarde; si sigue pasando, avisale a quien administra la app.",
  },
} as const satisfies Record<string, { codigo: CodigoDeError; mensaje: string }>;

type MotivoDelAsistente = keyof typeof ERRORES_DEL_ASISTENTE;

/** Cómo se reconoce cada motivo en el error del proveedor. Se prueban en orden: gana el primero que coincide. */
const RECONOCEDORES: readonly { motivo: MotivoDelAsistente; coincide: (causa: unknown) => boolean }[] = [
  // El timeout lo corta el SDK con un DOMException de nombre "TimeoutError".
  { motivo: "demorado", coincide: (causa) => causa instanceof Error && causa.name === "TimeoutError" },
  // Sin saldo no se arregla esperando: no cuenta como exceso de consultas y cae en `noDisponible`.
  {
    motivo: "demasiadasConsultas",
    coincide: (causa) => APICallError.isInstance(causa) && causa.statusCode === 429 && !esSinSaldo(causa),
  },
  // 5xx: el proveedor está caído o saturado. Es pasajero, no de configuración.
  {
    motivo: "proveedorSaturado",
    coincide: (causa) => APICallError.isInstance(causa) && causa.statusCode !== undefined && causa.statusCode >= 500,
  },
];

/** Un error de la app con el código y el mensaje de ese motivo. `causa`: el error original, para los logs. */
export function errorDelAsistente(motivo: MotivoDelAsistente, causa?: unknown): ErrorDeAplicacion {
  const { codigo, mensaje } = ERRORES_DEL_ASISTENTE[motivo];
  return new ErrorDeAplicacion(codigo, mensaje, causa === undefined ? undefined : { cause: causa });
}

/** ¿El error es de que la cuenta de OpenAI se quedó sin saldo? (llega como 429, igual que el exceso de consultas) */
function esSinSaldo(error: APICallError): boolean {
  // Hoy llega como type "insufficient_quota" + code "credit_balance_exhausted"; antes el code era "insufficient_quota".
  return /insufficient_quota|credit_balance_exhausted/.test(error.responseBody ?? "");
}

/**
 * Traduce un error del proveedor a un ErrorDeAplicacion buscándolo en ERRORES_DEL_ASISTENTE. El original queda en
 * `cause` para los logs; al usuario nunca le llega (ni la clave, ni el cuerpo de la respuesta de OpenAI).
 * `X.isInstance(error)` pregunta "¿este error es de la clase X?" (cada tipo de falla tiene su clase).
 */
export function traducirError(error: unknown): ErrorDeAplicacion {
  if (error instanceof ErrorDeAplicacion) return error;

  // Si se agotaron los reintentos, el SDK envuelve el error: lo que importa es el último.
  const causa = RetryError.isInstance(error) ? error.lastError : error;
  const motivo = RECONOCEDORES.find((reconocedor) => reconocedor.coincide(causa))?.motivo ?? "noDisponible";
  return errorDelAsistente(motivo, error);
}

/** El modelo no se pudo crear (ej. falta OPENAI_API_KEY): se corta con el error traducido, antes de guardar nada. */
export function lanzarErrorDeConfiguracion(error: unknown): never {
  throw traducirError(error);
}

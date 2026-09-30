import { getStaticToolName, isStaticToolUIPart, isToolUIPart } from "ai";
import type { NombreDeHerramienta, ParteDelAsistente } from "@/shared/chat";
import { leerErrorPublico, type ErrorPublico } from "@/shared/erroresShared";
import { formatoDuracion } from "./formato";

/**
 * El error del chat como lo muestra la vista: su código (para decidir qué ofrecer, ej. "Reintentar") y el mensaje
 * para el usuario. useChat pone en `error.message` el cuerpo de la respuesta (si falló antes de empezar) o el texto
 * del error del stream (si falló en el medio): en los dos casos el servidor manda `{ error: { codigo, mensaje } }`.
 */
export function errorParaMostrar(error: Error | undefined): ErrorPublico {
  const delServidor = error?.message ? leerErrorPublico(error.message) : null;
  if (delServidor) return delServidor;
  // No vino del servidor: el pedido no llegó (sin internet, servidor caído) o algo que no conocemos. Nunca se muestra
  // el texto crudo del error.
  return {
    codigo: "sin_conexion",
    mensaje: "No pudimos contactar al asistente. Revisá tu conexión y probá de nuevo.",
  };
}

/**
 * ¿El usuario está mirando el final de la conversación? (a menos de `margen` píxeles del fondo)
 * Si está ahí, el chat lo acompaña mientras llega la respuesta; si subió a leer algo, no se lo mueve.
 */
export function estaCercaDelFinal(
  { scrollTop, scrollHeight, clientHeight }: { scrollTop: number; scrollHeight: number; clientHeight: number },
  margen = 80
): boolean {
  return scrollHeight - scrollTop - clientHeight <= margen;
}

/**
 * Un cuadro de la animación que acompaña al texto: avanza una parte de lo que falta hasta el final (al principio
 * más rápido, cerca del final más despacio) y al menos 1 px, para que siempre termine de llegar.
 * `fraccion` controla la velocidad: 0.06 ≈ un deslizamiento suave, sin saltos.
 */
export function siguienteScroll(actual: number, objetivo: number, fraccion = 0.06): number {
  const falta = objetivo - actual;
  if (falta <= 1) return objetivo;
  return actual + Math.max(1, falta * fraccion);
}

/**
 * Qué le mostramos al usuario mientras el asistente usa cada tool, y cuando ya la usó (heurística #1).
 * Tipado con los nombres reales de las tools: si se agrega o renombra una, esto deja de compilar hasta tener su texto.
 */
export const TEXTOS_DE_HERRAMIENTAS: Record<NombreDeHerramienta, { usando: string; usada: string }> = {
  registrar_movimiento: {
    usando: "Registrando el movimiento…",
    usada: "Registró el movimiento",
  },
  consultar_movimientos: {
    usando: "Buscando tus movimientos…",
    usada: "Consultó tus movimientos",
  },
  estadisticas: {
    usando: "Calculando tus estadísticas…",
    usada: "Calculó tus estadísticas",
  },
  borrar_movimiento: {
    usando: "Borrando el movimiento…",
    usada: "Borró el movimiento",
  },
  convertir: {
    usando: "Convirtiendo con la cotización del día…",
    usada: "Convirtió con la cotización del día",
  },
  cotizacion_dolar: {
    usando: "Consultando la cotización del dólar…",
    usada: "Consultó la cotización del dólar",
  },
};

/** La API externa de las cotizaciones del dólar: se cita mientras el asistente la consulta. */
const FUENTE_DEL_DOLAR = "dolarapi.com";

/**
 * De qué API externa saca datos una herramienta mientras trabaja, o null si trabaja solo con los datos de la persona (su
 * base). El dólar sale de dolarapi.com, también al registrar un movimiento en dólares (que busca la cotización del día).
 */
export function fuenteDeLaHerramienta(parte: ParteDelAsistente): string | null {
  if (!isStaticToolUIPart(parte)) return null;
  switch (parte.type) {
    case "tool-cotizacion_dolar":
    case "tool-convertir":
      return FUENTE_DEL_DOLAR;
    case "tool-registrar_movimiento":
      // Mientras el modelo escribe los datos, la moneda puede no haber llegado todavía.
      return parte.input?.moneda === "USD" ? FUENTE_DEL_DOLAR : null;
    default:
      return null;
  }
}

/**
 * Lo que dice la línea de estado mientras una herramienta trabaja, con la API que consulta si usa una: «Consultando la
 * cotización del dólar en dolarapi.com…».
 */
export function textoDeHerramientaEnCurso(parte: ParteDelAsistente): string {
  if (!isStaticToolUIPart(parte)) return "";
  const { usando } = TEXTOS_DE_HERRAMIENTAS[getStaticToolName(parte) as NombreDeHerramienta];
  const fuente = fuenteDeLaHerramienta(parte);
  return fuente ? usando.replace(/…$/, ` en ${fuente}…`) : usando;
}

/**
 * Qué ve el usuario de cada uso de una tool: un ícono y el texto (nunca solo el ícono). `ms`: lo que tardó, si el servidor
 * ya lo midió (se agrega al final: «Consultó tus movimientos · 0,8 s»).
 */
export function avisoDeHerramienta(parte: ParteDelAsistente, ms?: number): { icono: string; texto: string } | null {
  if (!isStaticToolUIPart(parte)) return null;
  const textos = TEXTOS_DE_HERRAMIENTAS[getStaticToolName(parte) as NombreDeHerramienta];
  const duracion = ms === undefined ? "" : ` · ${formatoDuracion(ms)}`;
  if (herramientaFallo(parte)) return { icono: "⚠", texto: `No se pudo: ${textos.usada.toLowerCase()}${duracion}` };
  if (parte.state === "output-available") return { icono: "✓", texto: `${textos.usada}${duracion}` };
  return { icono: "…", texto: textos.usando };
}

/** ¿La tool terminó pero falló? (ej. el servicio de cotizaciones no respondió) — para mostrar el aviso con ⚠. */
export function herramientaFallo(parte: ParteDelAsistente): boolean {
  if (!isToolUIPart(parte)) return false;
  if (parte.state === "output-error") return true;
  if (parte.state !== "output-available") return false;
  // Las tools devuelven un resultado { ok, ... }.
  const salida: unknown = parte.output;
  return typeof salida === "object" && salida !== null && "ok" in salida && salida.ok === false;
}

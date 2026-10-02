import { isStaticToolUIPart } from "ai";
import { textoDe, type AsistenteUIMessage } from "@/shared/chat";
import { tituloDesde } from "@/shared/conversaciones";
import type { NombreDeIcono } from "../compartidos/iconos";
import { textoDeHerramientaEnCurso } from "./tipos";

// Qué hace la vista cuando termina una respuesta del asistente. Funciones puras: las usa useChatDelAsistente.

/** Lo que lee el lector de pantalla cuando el asistente termina de responder (la respuesta entera, una sola vez). */
export function anuncioDeRespuesta(respuesta: AsistenteUIMessage): string {
  return `El asistente respondió: ${textoDe(respuesta)}`;
}

/**
 * ¿La respuesta registró o borró un movimiento? Entonces el panel «Este mes» quedó desactualizado y hay que pedir de
 * nuevo los datos de la página. Solo cuenta si la tool salió bien: un intento fallido no cambió nada.
 */
export function cambioLosMovimientos(respuesta: AsistenteUIMessage): boolean {
  return respuesta.parts.some(
    (parte) =>
      isStaticToolUIPart(parte) &&
      (parte.type === "tool-registrar_movimiento" || parte.type === "tool-borrar_movimiento") &&
      parte.state === "output-available" &&
      parte.output.ok
  );
}

/** Qué hacer cuando termina una respuesta (ver useChatDelAsistente). */
export type AccionesAlTerminar = {
  /** Anunciarla al lector de pantalla: solo una respuesta completa (no la cortada con «Detener» ni un error). */
  anunciar: boolean;
  /** Subir la conversación en la lista del costado: siempre que no falló (aunque se haya cortado, quedó guardada). */
  actualizarLaLista: boolean;
  /** Pedirle al servidor un título según lo que se habló: solo con una respuesta completa. */
  retitular: boolean;
  /** Volver a leer «Este mes»: si no falló y registró o borró un movimiento. */
  refrescarElResumen: boolean;
};

/** Qué hacer al terminar una respuesta, según cómo terminó y si cambió algún movimiento. */
export function accionesAlTerminar({
  seCorto,
  fallo,
  cambiaronLosMovimientos,
}: {
  seCorto: boolean;
  fallo: boolean;
  cambiaronLosMovimientos: boolean;
}): AccionesAlTerminar {
  const completa = !seCorto && !fallo;
  return {
    anunciar: completa,
    actualizarLaLista: !fallo,
    retitular: completa,
    refrescarElResumen: !fallo && cambiaronLosMovimientos,
  };
}

/**
 * El título de la conversación para el sidebar: el mismo que le pone el servidor al crearla (a partir del primer
 * mensaje del usuario), así el sidebar lo muestra sin volver a consultar la base.
 */
export function tituloDeLaConversacion(mensajes: AsistenteUIMessage[]): string {
  const primero = mensajes.find((mensaje) => mensaje.role === "user");
  return tituloDesde(primero ? textoDe(primero) : "");
}

/** Un atajo: una consulta frecuente que se ejecuta con un toque, en el «+» del campo de texto y en la barra lateral. */
export type Atajo = {
  id: string;
  /** Cómo se llama la función (en la barra lateral va solo esto). */
  titulo: string;
  /** Qué hace, en una línea (en el menú del «+», debajo del título). */
  descripcion: string;
  icono: NombreDeIcono;
  /** El mensaje que se le manda al asistente al elegirlo. */
  mensaje: string;
};

/**
 * Los atajos: consultas que se ejecutan directo, sin pedirle nada a la persona (por eso registrar un gasto o un ingreso no
 * está: necesita datos, y eso se escribe en el chat). Heurística #6, reconocer antes que recordar; y pocos, para no abrumar
 * (ley de Hick).
 */
export const ATAJOS: readonly Atajo[] = [
  {
    id: "resumen-del-mes",
    titulo: "Resumen del mes",
    descripcion: "¿Cómo vengo este mes?",
    icono: "resumen",
    mensaje: "¿Cómo vengo este mes? Mostrame el resumen.",
  },
  {
    id: "gastos-por-categoria",
    titulo: "Gastos por categoría",
    descripcion: "¿En qué gasto más?",
    icono: "categorias",
    mensaje: "¿En qué categorías gasté más este mes?",
  },
  {
    id: "cotizacion-del-dolar",
    titulo: "Cotización del dólar",
    descripcion: "¿A cuánto está el dólar hoy?",
    icono: "dolar",
    mensaje: "¿A cuánto está el dólar hoy?",
  },
];

/** Lo que dice la vista mientras el asistente todavía no empezó a escribir (o entre un paso y otro). */
export const TEXTO_PENSANDO = "Pensando…";

/**
 * Qué está haciendo el asistente ahora mismo, en una sola línea que va cambiando: «Pensando…» mientras espera al modelo, y
 * cuando usa una herramienta, lo que hace con la API que consulta («Consultando la cotización del dólar en
 * dolarapi.com…»). Cuando el texto de la respuesta ya está llegando no hace falta ningún aviso (`null`): la persona lo está
 * leyendo.
 */
export function estadoDeLaRespuesta(
  estado: "submitted" | "streaming" | "ready" | "error",
  mensajes: AsistenteUIMessage[]
): string | null {
  if (estado === "submitted") return TEXTO_PENSANDO;
  if (estado !== "streaming") return null;

  const ultimo = mensajes.at(-1);
  if (ultimo?.role !== "assistant") return TEXTO_PENSANDO;

  const enCurso = ultimo.parts.findLast(
    (parte) => isStaticToolUIPart(parte) && parte.state !== "output-available" && parte.state !== "output-error"
  );
  if (enCurso) return textoDeHerramientaEnCurso(enCurso);
  const ultimaParte = ultimo.parts.at(-1);
  return ultimaParte?.type === "text" && ultimaParte.text.trim().length > 0 ? null : TEXTO_PENSANDO;
}

/**
 * ¿Ya se puede mostrar la respuesta que se está generando? Si usa herramientas, recién cuando terminaron todas y llegó el
 * texto que sigue (la respuesta armada con lo que devolvieron): mientras trabajan, lo único que se ve es la línea de estado.
 * Sin herramientas se muestra desde la primera palabra. Una respuesta que ya terminó (o de una conversación guardada) se
 * muestra siempre.
 */
export function mensajeListoParaMostrar(mensaje: AsistenteUIMessage, seEstaGenerando: boolean): boolean {
  if (!seEstaGenerando || mensaje.role !== "assistant") return true;
  const ultimaTool = mensaje.parts.findLastIndex((parte) => isStaticToolUIPart(parte));
  if (ultimaTool === -1) return true;
  const terminaronTodas = mensaje.parts
    .filter(isStaticToolUIPart)
    .every((parte) => parte.state === "output-available" || parte.state === "output-error");
  const hayTextoDespues = mensaje.parts
    .slice(ultimaTool + 1)
    .some((parte) => parte.type === "text" && parte.text.trim() !== "");
  return terminaronTodas && hayTextoDespues;
}

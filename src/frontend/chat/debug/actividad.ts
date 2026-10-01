import type { MetadatosDeRespuesta } from "@/shared/chat";
import { formatoTokens } from "../compartidos/formato";

// Qué mide el servidor de cada respuesta (ver MetadatosDeRespuesta) y cómo se cuenta en pantalla. Funciones puras.

/** Cuánto tardó una tool de la respuesta, o undefined si todavía no terminó (o si la respuesta viene de la base). */
export function duracionDeLaTool(metadatos: MetadatosDeRespuesta | undefined, toolCallId: string): number | undefined {
  return metadatos?.herramientas?.find((herramienta) => herramienta.id === toolCallId)?.ms;
}

/**
 * El uso de una respuesta terminada, una línea por dato: el modelo, y los tokens. Los de «entrada» son el contexto que se
 * le mandó al modelo (el historial, las instrucciones y lo que devolvieron las tools); los de «salida», lo que escribió.
 * Vacío mientras la respuesta no terminó, o si viene de la base (la medición no se guarda).
 */
export function lineasDeUso(metadatos: MetadatosDeRespuesta | undefined): string[] {
  if (metadatos?.ms === undefined) return [];
  const { tokens, modelo, pasos } = metadatos;
  const lineas: string[] = [];
  if (modelo) lineas.push(`Modelo: ${modelo}${pasos ? ` · ${pasos === 1 ? "1 paso" : `${pasos} pasos`}` : ""}`);
  if (tokens?.entrada !== undefined) lineas.push(`Contexto enviado (entrada): ${formatoTokens(tokens.entrada)} tokens`);
  if (tokens?.salida !== undefined) lineas.push(`Respuesta (salida): ${formatoTokens(tokens.salida)} tokens`);
  if (tokens?.total !== undefined) lineas.push(`Total: ${formatoTokens(tokens.total)} tokens`);
  return lineas;
}

import type { TamanoDeLetra } from "./tamanoDeLetra";

// Las validaciones de frontend/compartidos. Sin Zod: son chequeos chicos y así no se suma su peso al navegador.

const TAMANOS_VALIDOS: readonly string[] = ["normal", "grande", "muy-grande"] satisfies TamanoDeLetra[];

/** ¿Es uno de los tamaños de letra que existen? (Lo guardado en el navegador puede ser cualquier cosa.) */
export function esTamanoDeLetra(valor: unknown): valor is TamanoDeLetra {
  return typeof valor === "string" && TAMANOS_VALIDOS.includes(valor);
}

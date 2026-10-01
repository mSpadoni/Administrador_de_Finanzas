// Las validaciones de frontend/compartidos. Sin Zod: son chequeos chicos y así no se suma su peso al navegador.

type Limites = { minimo: number; maximo: number; paso: number };

/**
 * ¿Es un tamaño de letra válido? Un número entero entre el mínimo y el máximo, de a `paso` (lo guardado en el navegador
 * o en la página puede ser cualquier cosa).
 */
export function esPorcentajeDeLetra(valor: unknown, { minimo, maximo, paso }: Limites): valor is number {
  return (
    typeof valor === "number" &&
    Number.isInteger(valor) &&
    valor >= minimo &&
    valor <= maximo &&
    (valor - minimo) % paso === 0
  );
}

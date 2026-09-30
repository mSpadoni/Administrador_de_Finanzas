// Cómo se maneja la plata en el dominio (docs/ARQUITECTURA.md, «Plata y fechas»): los pesos y los dólares tienen dos
// decimales, y las sumas se hacen en centavos enteros para que 0,1 + 0,2 dé 0,3. Lógica pura.

/** Centavos por peso (o por dólar). */
const CENTAVOS_POR_UNIDAD = 100;

/** Pasa un monto en pesos (o dólares) a centavos enteros. */
export const aCentavos = (monto: number): number => Math.round(monto * CENTAVOS_POR_UNIDAD);

/** Pasa centavos a pesos (o dólares). */
export const aPesos = (centavos: number): number => centavos / CENTAVOS_POR_UNIDAD;

/** Redondea a dos decimales (pesos, dólares o porcentajes). */
export const redondear = (valor: number): number => aPesos(aCentavos(valor));

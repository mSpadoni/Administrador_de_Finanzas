import { lanzarPeriodoAlReves } from "./erroresDominio";

// Los períodos de las consultas (CONTEXT.md): rangos de días del calendario en hora de Argentina, con los dos
// extremos incluidos. Lógica pura: el "ahora" entra por parámetro. Las fechas son "AAAA-MM-DD"; para operar se
// pasan a Date en UTC (sin horas), así no interviene la zona horaria de la máquina.

/** Un rango de días, con los dos extremos incluidos. */
export type Periodo = { desde: string; hasta: string };

/** Las unidades con las que se piden los períodos más comunes. */
export type UnidadDePeriodo = "dia" | "semana" | "mes";

const MS_POR_DIA = 86_400_000;

const aDate = (fecha: string) => new Date(`${fecha}T00:00:00Z`);
const aFecha = (date: Date) => date.toISOString().slice(0, 10);
const sumarDias = (fecha: string, dias: number) => aFecha(new Date(aDate(fecha).getTime() + dias * MS_POR_DIA));

/** El día de hoy en Argentina (sin horario de verano: UTC−3 todo el año). */
export function hoyEnArgentina(ahora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(ahora);
}

/**
 * Cómo se arma el período de cada unidad: una estrategia por unidad (`Record` obliga a que cada unidad nueva tenga la
 * suya: si se agrega "año" a UnidadDePeriodo y no acá, no compila).
 */
const PERIODO_POR_UNIDAD: Record<UnidadDePeriodo, (fecha: string) => Periodo> = {
  dia: (fecha) => ({ desde: fecha, hasta: fecha }),
  semana: (fecha) => {
    // getUTCDay: 0 = domingo. Días desde el lunes: lunes 0 … domingo 6.
    const desdeElLunes = (aDate(fecha).getUTCDay() + 6) % 7;
    const lunes = sumarDias(fecha, -desdeElLunes);
    return { desde: lunes, hasta: sumarDias(lunes, 6) };
  },
  mes: (fecha) => {
    const dia = aDate(fecha);
    const primero = new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), 1));
    const ultimo = new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth() + 1, 0));
    return { desde: aFecha(primero), hasta: aFecha(ultimo) };
  },
};

/** El día, la semana (de lunes a domingo) o el mes calendario que contiene a `fecha`. */
export function periodoDe(unidad: UnidadDePeriodo, fecha: string): Periodo {
  return PERIODO_POR_UNIDAD[unidad](fecha);
}

/** Un período explícito. Un rango que termina antes de empezar es un error. */
export function rango(desde: string, hasta: string): Periodo {
  if (desde > hasta) return lanzarPeriodoAlReves(desde, hasta);
  return { desde, hasta };
}

/** Cuántos días tiene el período, contando los dos extremos. */
export function diasDe({ desde, hasta }: Periodo): number {
  return Math.round((aDate(hasta).getTime() - aDate(desde).getTime()) / MS_POR_DIA) + 1;
}

/** ¿La fecha cae dentro del período? (Las fechas AAAA-MM-DD se comparan bien como texto.) */
export function contiene({ desde, hasta }: Periodo, fecha: string): boolean {
  return desde <= fecha && fecha <= hasta;
}

/** ¿El período es un mes calendario entero? */
function esMesCompleto(periodo: Periodo): boolean {
  const mes = periodoDe("mes", periodo.desde);
  return mes.desde === periodo.desde && mes.hasta === periodo.hasta;
}

/**
 * El período con el que se compara (CONTEXT.md): el mes anterior para un mes calendario; si no, la misma cantidad
 * de días justo antes (para una semana es la semana anterior; para un día, el día anterior).
 */
export function periodoAnterior(periodo: Periodo): Periodo {
  if (esMesCompleto(periodo)) return periodoDe("mes", sumarDias(periodo.desde, -1));
  const dias = diasDe(periodo);
  return { desde: sumarDias(periodo.desde, -dias), hasta: sumarDias(periodo.desde, -1) };
}

/**
 * Cómo se pide un período (lo arma el asistente a partir de lo que dice la persona): un rango explícito (`desde`,
 * y `hasta` o hasta hoy) o una unidad (por defecto el mes) que contiene a `referencia` (por defecto hoy).
 */
export type PedidoDePeriodo = { unidad?: UnidadDePeriodo; referencia?: string; desde?: string; hasta?: string };

/** El período que se pidió. `hoy`: la fecha de hoy en Argentina. Un rango al revés es un error. */
export function resolverPeriodo({ unidad = "mes", referencia, desde, hasta }: PedidoDePeriodo, hoy: string): Periodo {
  if (desde) return rango(desde, hasta ?? hoy);
  return periodoDe(unidad, referencia ?? hoy);
}

import type { Categoria, Movimiento, TipoDeMovimiento } from "./movimiento";
import { contiene, diasDe, periodoAnterior, type Periodo } from "./periodo";

// Balance y estadísticas de un período (CONTEXT.md). Lógica pura. Todo en pesos (el monto en pesos de cada
// movimiento) y sumado en centavos enteros, así 0,1 + 0,2 da 0,3.

/** Ingresos, gastos y balance (ingresos − gastos) de un conjunto de movimientos, en pesos. */
export type Resumen = { ingresos: number; gastos: number; balance: number };

/** El total de una categoría y qué porcentaje es del total de su tipo. */
export type TotalPorCategoria = { tipo: TipoDeMovimiento; categoria: Categoria; total: number; porcentaje: number };

/** Las estadísticas de un período. `porcentaje` es null si en el período anterior no hubo gastos. */
export type Estadisticas = {
  periodo: Periodo;
  resumen: Resumen;
  porCategoria: TotalPorCategoria[];
  promedioDiarioDeGastos: number;
  variacionDeGastos: { anterior: number; porcentaje: number | null };
};

const aCentavos = (pesos: number) => Math.round(pesos * 100);
const aPesos = (centavos: number) => centavos / 100;
/** Redondea a dos decimales (pesos o porcentajes). */
const redondear = (valor: number) => Math.round(valor * 100) / 100;

/** Suma en centavos el monto en pesos de los movimientos de un tipo. */
function totalEnCentavos(movimientos: readonly Movimiento[], tipo: TipoDeMovimiento): number {
  return movimientos.filter((m) => m.tipo === tipo).reduce((suma, m) => suma + aCentavos(m.montoEnPesos), 0);
}

export function resumen(movimientos: readonly Movimiento[]): Resumen {
  const ingresos = totalEnCentavos(movimientos, "ingreso");
  const gastos = totalEnCentavos(movimientos, "gasto");
  return { ingresos: aPesos(ingresos), gastos: aPesos(gastos), balance: aPesos(ingresos - gastos) };
}

/** Los totales por tipo y categoría: primero los gastos y después los ingresos, cada grupo de mayor a menor. */
export function totalesPorCategoria(movimientos: readonly Movimiento[]): TotalPorCategoria[] {
  const centavos = new Map<string, { tipo: TipoDeMovimiento; categoria: Categoria; total: number }>();
  for (const m of movimientos) {
    const clave = `${m.tipo}/${m.categoria}`;
    const actual = centavos.get(clave) ?? { tipo: m.tipo, categoria: m.categoria, total: 0 };
    actual.total += aCentavos(m.montoEnPesos);
    centavos.set(clave, actual);
  }
  const totalDelTipo = {
    gasto: totalEnCentavos(movimientos, "gasto"),
    ingreso: totalEnCentavos(movimientos, "ingreso"),
  };
  return [...centavos.values()]
    .sort((a, b) => (a.tipo === b.tipo ? b.total - a.total : a.tipo === "gasto" ? -1 : 1))
    .map(({ tipo, categoria, total }) => ({
      tipo,
      categoria,
      total: aPesos(total),
      porcentaje: redondear((total * 100) / totalDelTipo[tipo]),
    }));
}

/**
 * Las estadísticas de un período: resumen, totales por categoría, promedio diario de gastos y variación de los
 * gastos contra el período anterior. Solo cuenta los movimientos que caen dentro de cada período.
 */
export function estadisticas(
  movimientos: readonly Movimiento[],
  periodo: Periodo,
  movimientosAnteriores: readonly Movimiento[]
): Estadisticas {
  const delPeriodo = movimientos.filter((m) => contiene(periodo, m.fecha));
  const anterior = periodoAnterior(periodo);
  const delAnterior = movimientosAnteriores.filter((m) => contiene(anterior, m.fecha));

  const actual = resumen(delPeriodo);
  const gastosAnteriores = resumen(delAnterior).gastos;
  return {
    periodo,
    resumen: actual,
    porCategoria: totalesPorCategoria(delPeriodo),
    promedioDiarioDeGastos: redondear(actual.gastos / diasDe(periodo)),
    variacionDeGastos: {
      anterior: gastosAnteriores,
      porcentaje:
        gastosAnteriores === 0 ? null : redondear(((actual.gastos - gastosAnteriores) * 100) / gastosAnteriores),
    },
  };
}

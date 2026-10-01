import { describe, expect, it } from "vitest";
import { estadisticas, resumen, totalesPorCategoria } from "@/backend/models/dominio/estadisticas";
import type { Movimiento } from "@/backend/models/dominio/movimiento";
import { periodoDe } from "@/backend/models/dominio/periodo";

// Balance y estadísticas de un período (CONTEXT.md). Lógica pura: siempre en pesos (el monto en pesos de cada
// movimiento) y con aritmética exacta al centavo.

let siguienteId = 0;
/** Un movimiento en pesos; cada test cambia lo que le importa. */
const mov = (cambios: Partial<Movimiento>): Movimiento => ({
  id: `m${++siguienteId}`,
  tipo: "gasto",
  monto: 1000,
  moneda: "ARS",
  montoEnPesos: 1000,
  cotizacion: null,
  categoria: "supermercado",
  medioDePago: "debito",
  descripcion: "Algo",
  fecha: "2026-09-10",
  ...cambios,
});

describe("resumen", () => {
  it("suma ingresos y gastos en pesos y calcula el balance", () => {
    const movimientos = [
      mov({ tipo: "ingreso", categoria: "sueldo", montoEnPesos: 500000, monto: 500000 }),
      mov({ montoEnPesos: 120000.5, monto: 120000.5 }),
      mov({ montoEnPesos: 30000.25, monto: 30000.25 }),
    ];

    expect(resumen(movimientos)).toEqual({ ingresos: 500000, gastos: 150000.75, balance: 349999.25 });
  });

  it("usa el monto en pesos: un gasto en dólares suma lo que valía en pesos ese día", () => {
    const enDolares = mov({
      moneda: "USD",
      monto: 20,
      montoEnPesos: 28000,
      cotizacion: { tipoDeDolar: "oficial", valor: 1400 },
    });

    expect(resumen([enDolares]).gastos).toBe(28000);
  });

  it("es exacto al centavo (0,1 + 0,2 da 0,3, no 0,30000000000000004)", () => {
    expect(resumen([mov({ montoEnPesos: 0.1 }), mov({ montoEnPesos: 0.2 })]).gastos).toBe(0.3);
  });

  it("sin movimientos, todo en cero", () => {
    expect(resumen([])).toEqual({ ingresos: 0, gastos: 0, balance: 0 });
  });
});

describe("totalesPorCategoria", () => {
  it("agrupa por tipo y categoría, de mayor a menor, con el porcentaje sobre el total de su tipo", () => {
    const movimientos = [
      mov({ categoria: "supermercado", montoEnPesos: 30000 }),
      mov({ categoria: "transporte", montoEnPesos: 10000 }),
      mov({ categoria: "supermercado", montoEnPesos: 20000 }),
      mov({ tipo: "ingreso", categoria: "sueldo", montoEnPesos: 400000 }),
    ];

    expect(totalesPorCategoria(movimientos)).toEqual([
      { tipo: "gasto", categoria: "supermercado", total: 50000, porcentaje: 83.33 },
      { tipo: "gasto", categoria: "transporte", total: 10000, porcentaje: 16.67 },
      { tipo: "ingreso", categoria: "sueldo", total: 400000, porcentaje: 100 },
    ]);
  });
});

describe("estadisticas", () => {
  const septiembre = periodoDe("mes", "2026-09-01");

  it("junta el resumen, los totales por categoría y el promedio diario de gastos del período", () => {
    const resultado = estadisticas(
      [mov({ montoEnPesos: 60000 }), mov({ tipo: "ingreso", categoria: "sueldo", montoEnPesos: 300000 })],
      septiembre,
      []
    );

    expect(resultado.periodo).toEqual(septiembre);
    expect(resultado.resumen).toEqual({ ingresos: 300000, gastos: 60000, balance: 240000 });
    expect(resultado.porCategoria).toHaveLength(2);
    // 60000 en 30 días.
    expect(resultado.promedioDiarioDeGastos).toBe(2000);
  });

  it("compara los gastos con el período anterior", () => {
    const resultado = estadisticas([mov({ montoEnPesos: 150000 })], septiembre, [
      mov({ montoEnPesos: 120000, fecha: "2026-08-10" }),
    ]);

    expect(resultado.variacionDeGastos).toEqual({ anterior: 120000, porcentaje: 25 });
  });

  it("si en el período anterior no hubo gastos, no hay porcentaje de variación (no se divide por cero)", () => {
    expect(estadisticas([mov({})], septiembre, []).variacionDeGastos).toEqual({ anterior: 0, porcentaje: null });
  });

  it("solo cuenta los movimientos que caen dentro de cada período", () => {
    const resultado = estadisticas(
      [mov({ montoEnPesos: 1000 }), mov({ montoEnPesos: 999, fecha: "2026-10-01" })],
      septiembre,
      [mov({ montoEnPesos: 500, fecha: "2026-08-20" }), mov({ montoEnPesos: 777, fecha: "2026-09-02" })]
    );

    expect(resultado.resumen.gastos).toBe(1000);
    expect(resultado.variacionDeGastos.anterior).toBe(500);
  });
});

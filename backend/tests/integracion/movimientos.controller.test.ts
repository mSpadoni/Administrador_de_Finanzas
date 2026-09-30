import { afterAll, describe, expect, it } from "vitest";
import { MovimientosController } from "@/backend/controllers/movimientos.controller";
import type { DatosDeMovimiento } from "@/backend/models/dominio/movimiento";
import { MovimientosModel } from "@/backend/models/repositorios/movimientos.model";
import { borrarUsuariosDePrueba, crearUsuarioLogueado } from "../helpers/usuarioDePrueba";

// El resumen del mes que lee el panel «Este mes», contra la base local con personas reales logueadas (RLS de verdad).
// «Hoy» es fijo: nada depende del reloj. Los demás casos de uso (registrar, consultar, convertir...) se prueban por las
// tools en movimientos.tools.test.ts, que es como los usa el asistente.
afterAll(borrarUsuariosDePrueba);

const HOY = "2026-09-29";

const movimiento = (cambios: Partial<DatosDeMovimiento>): DatosDeMovimiento => ({
  tipo: "gasto",
  monto: 10000,
  moneda: "ARS",
  categoria: "supermercado",
  medioDePago: "debito",
  descripcion: "Compra",
  fecha: "2026-09-10",
  ...cambios,
});

/** Una persona logueada, con su modelo y el controller que lee sus movimientos. */
async function persona() {
  const { navegador } = await crearUsuarioLogueado();
  const modelo = new MovimientosModel(navegador.crearCliente);
  return {
    modelo,
    controller: new MovimientosController(
      () => modelo,
      undefined,
      () => HOY
    ),
  };
}

describe("MovimientosController.estadisticasDelMes", () => {
  it("resume el mes en curso y lo compara con el mes anterior", async () => {
    const { modelo, controller } = await persona();
    await modelo.registrar(movimiento({ monto: 150000, categoria: "supermercado" }), null);
    await modelo.registrar(movimiento({ monto: 100000, categoria: "ocio", fecha: "2026-09-29" }), null);
    await modelo.registrar(
      movimiento({ tipo: "ingreso", categoria: "sueldo", monto: 1000000, fecha: "2026-09-01" }),
      null
    );
    await modelo.registrar(movimiento({ monto: 200000, fecha: "2026-08-15" }), null); // mes anterior

    const { periodo, resumen, porCategoria, variacionDeGastos } = await controller.estadisticasDelMes();

    expect(periodo).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
    expect(resumen).toEqual({ ingresos: 1000000, gastos: 250000, balance: 750000 });
    expect(porCategoria.filter((c) => c.tipo === "gasto").map((c) => [c.categoria, c.porcentaje])).toEqual([
      ["supermercado", 60],
      ["ocio", 40],
    ]);
    expect(variacionDeGastos).toEqual({ anterior: 200000, porcentaje: 25 });
  });

  it("no cuenta los movimientos de otro mes ni los de otras personas", async () => {
    const otra = await persona();
    await otra.modelo.registrar(movimiento({ monto: 999999 }), null);
    const { modelo, controller } = await persona();
    await modelo.registrar(movimiento({ monto: 5000, fecha: "2026-10-01" }), null); // el mes que viene

    const { resumen } = await controller.estadisticasDelMes();

    expect(resumen).toEqual({ ingresos: 0, gastos: 0, balance: 0 });
  });
});

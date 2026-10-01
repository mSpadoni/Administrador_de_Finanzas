import { afterAll, describe, expect, it } from "vitest";
import { ErrorDeDominio } from "@/backend/models/dominio/erroresDominio";
import type { DatosDeMovimiento } from "@/backend/models/dominio/movimiento";
import { periodoDe } from "@/backend/models/dominio/periodo";
import { MovimientosModel } from "@/backend/models/repositorios/movimientos.model";
import { borrarUsuariosDePrueba, crearUsuarioLogueado } from "@/backend/tests/helpers/supabase/usuarioDePrueba";

// MovimientosModel contra la base local de Supabase, con personas reales logueadas (RLS se aplica de verdad).
afterAll(borrarUsuariosDePrueba);

const GASTO: DatosDeMovimiento = {
  tipo: "gasto",
  monto: 15000,
  moneda: "ARS",
  categoria: "supermercado",
  medioDePago: "debito",
  descripcion: "Compra del súper",
  fecha: "2026-09-10",
};

/** Una persona logueada con su repositorio de movimientos. */
async function personaConMovimientos() {
  const persona = await crearUsuarioLogueado();
  return { persona, movimientos: new MovimientosModel(persona.navegador.crearCliente) };
}

describe("MovimientosModel.registrar", () => {
  it("guarda un gasto en pesos y lo devuelve con su id y su monto en pesos", async () => {
    const { movimientos } = await personaConMovimientos();

    const guardado = await movimientos.registrar(GASTO, null);

    expect(guardado).toMatchObject({ ...GASTO, montoEnPesos: 15000, cotizacion: null });
    expect(guardado.id).toEqual(expect.any(String));
  });

  it("guarda un movimiento en dólares con la cotización usada y su monto en pesos de ese día", async () => {
    const { movimientos } = await personaConMovimientos();
    const enDolares: DatosDeMovimiento = {
      ...GASTO,
      moneda: "USD",
      monto: 20,
      categoria: "suscripciones",
      descripcion: "Netflix",
    };

    const guardado = await movimientos.registrar(enDolares, { tipoDeDolar: "tarjeta", valor: 1850.5 });

    expect(guardado).toMatchObject({ montoEnPesos: 37010, cotizacion: { tipoDeDolar: "tarjeta", valor: 1850.5 } });
  });

  it("valida antes de guardar: un movimiento inválido no llega a la base", async () => {
    const { movimientos } = await personaConMovimientos();

    await expect(movimientos.registrar({ ...GASTO, categoria: "sueldo" }, null)).rejects.toBeInstanceOf(ErrorDeDominio);
    expect(await movimientos.listar(periodoDe("mes", "2026-09-01"))).toEqual([]);
  });
});

describe("MovimientosModel.listar", () => {
  it("devuelve los movimientos del período, el más reciente primero, y filtra por tipo y categoría", async () => {
    const { movimientos } = await personaConMovimientos();
    await movimientos.registrar({ ...GASTO, fecha: "2026-09-05", descripcion: "Primero" }, null);
    await movimientos.registrar({ ...GASTO, fecha: "2026-09-20", categoria: "transporte", descripcion: "SUBE" }, null);
    await movimientos.registrar(
      { ...GASTO, tipo: "ingreso", categoria: "sueldo", medioDePago: "transferencia", descripcion: "Sueldo" },
      null
    );
    await movimientos.registrar({ ...GASTO, fecha: "2026-10-01", descripcion: "Fuera del período" }, null);
    const septiembre = periodoDe("mes", "2026-09-01");

    const todos = await movimientos.listar(septiembre);
    const gastos = await movimientos.listar(septiembre, { tipo: "gasto" });
    const transporte = await movimientos.listar(septiembre, { categoria: "transporte" });

    expect(todos.map((m) => m.descripcion)).toEqual(["SUBE", "Sueldo", "Primero"]);
    expect(gastos.map((m) => m.descripcion)).toEqual(["SUBE", "Primero"]);
    expect(transporte.map((m) => m.descripcion)).toEqual(["SUBE"]);
  });

  it("cada persona ve solo sus movimientos", async () => {
    const duenia = await personaConMovimientos();
    const otra = await personaConMovimientos();
    await duenia.movimientos.registrar(GASTO, null);

    expect(await otra.movimientos.listar(periodoDe("mes", "2026-09-01"))).toEqual([]);
  });
});

describe("MovimientosModel.borrar", () => {
  it("borra un movimiento propio; uno ajeno o inexistente no se borra", async () => {
    const duenia = await personaConMovimientos();
    const otra = await personaConMovimientos();
    const guardado = await duenia.movimientos.registrar(GASTO, null);

    expect(await otra.movimientos.borrar(guardado.id)).toBe(false);
    expect(await duenia.movimientos.borrar(guardado.id)).toBe(true);
    expect(await duenia.movimientos.borrar(guardado.id)).toBe(false);
    expect(await duenia.movimientos.listar(periodoDe("mes", "2026-09-01"))).toEqual([]);
  });
});

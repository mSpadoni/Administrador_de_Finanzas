import { afterAll, afterEach, describe, expect, it } from "vitest";
import { MovimientosController, type MovimientosConsultados } from "@/backend/controllers/movimientos.controller";
import { ClienteDolar } from "@/backend/lib/dolar/clienteDolar";
import { MovimientosModel } from "@/backend/models/repositorios/movimientos.model";
import { crearToolsAsistente } from "@/backend/tools/asistente.tools";
import { levantarServidor, type Respuesta, type ServidorLocal } from "@/backend/tests/helpers/http/servidorHttpLocal";
import { borrarUsuariosDePrueba, crearUsuarioLogueado } from "@/backend/tests/helpers/supabase/usuarioDePrueba";

// Las tools de movimientos tal como las llama el modelo: contra la base local de Supabase (con una persona logueada,
// RLS de verdad) y un servidor HTTP local que responde como dolarapi.com. "Hoy" es fijo: nada depende del reloj.
afterAll(borrarUsuariosDePrueba);

const HOY = "2026-09-17";
const opciones = { toolCallId: "t", messages: [], context: {} };

const casa = (casa: string, compra: number, venta: number) => ({
  moneda: "USD",
  casa,
  nombre: casa,
  compra,
  venta,
  fechaActualizacion: "2026-09-17T17:00:00.000Z",
});
const DOLARES: Respuesta = {
  status: 200,
  headers: { "content-type": "application/json" },
  cuerpo: JSON.stringify([
    casa("oficial", 1495, 1545),
    casa("blue", 1540, 1560),
    casa("bolsa", 1537.4, 1557),
    casa("tarjeta", 1943.5, 2008.5),
  ]),
};

let servidor: ServidorLocal | undefined;
afterEach(async () => {
  await servidor?.cerrar();
  servidor = undefined;
});

/** Una persona logueada, sus tools (con un dolarapi que responde `dolarapi`) y su repositorio para mirar la base. */
async function personaConTools(dolarapi: Respuesta = DOLARES) {
  const persona = await crearUsuarioLogueado();
  const movimientos = new MovimientosModel(persona.navegador.crearCliente);
  servidor = await levantarServidor(() => dolarapi);
  const dolar = new ClienteDolar({ endpoint: servidor.url, reintentos: 0 });
  const controller = new MovimientosController(() => movimientos, dolar, () => HOY);
  const tools = crearToolsAsistente({ movimientos: controller });
  return { movimientos, tools, dolarapi: servidor };
}

const septiembre = { desde: "2026-09-01", hasta: "2026-09-30" };

describe("registrar_movimiento", () => {
  it("un gasto en pesos se guarda tal cual; sin fecha, es de hoy", async () => {
    const { movimientos, tools, dolarapi } = await personaConTools();

    const resultado = await tools.registrar_movimiento.execute!(
      {
        tipo: "gasto",
        monto: 5000,
        moneda: "ARS",
        categoria: "supermercado",
        medioDePago: "debito",
        descripcion: "Súper",
      },
      opciones
    );

    expect(resultado).toMatchObject({ ok: true, movimiento: { fecha: HOY, montoEnPesos: 5000, cotizacion: null } });
    expect(await movimientos.listar(septiembre)).toHaveLength(1);
    expect(dolarapi.pedidos()).toBe(0); // en pesos no hace falta la cotización
  });

  it("un gasto en dólares se pasa a pesos con el valor de venta del tipo de dólar pedido", async () => {
    const { tools } = await personaConTools();

    const resultado = await tools.registrar_movimiento.execute!(
      {
        tipo: "gasto",
        monto: 20,
        moneda: "USD",
        categoria: "suscripciones",
        medioDePago: "credito",
        descripcion: "Netflix",
        fecha: "2026-09-10",
        tipoDeDolar: "tarjeta",
      },
      opciones
    );

    expect(resultado).toMatchObject({
      ok: true,
      movimiento: { montoEnPesos: 40170, cotizacion: { tipoDeDolar: "tarjeta", valor: 2008.5 } },
    });
  });

  it("un ingreso en dólares sin tipo de dólar usa el oficial, con el valor de compra", async () => {
    const { tools } = await personaConTools();

    const resultado = await tools.registrar_movimiento.execute!(
      {
        tipo: "ingreso",
        monto: 100,
        moneda: "USD",
        categoria: "trabajo_independiente",
        medioDePago: "transferencia",
        descripcion: "Freelance",
      },
      opciones
    );

    expect(resultado).toMatchObject({
      ok: true,
      movimiento: { montoEnPesos: 149500, cotizacion: { tipoDeDolar: "oficial", valor: 1495 } },
    });
  });

  it("si el servicio del dólar no responde, no guarda nada y devuelve el motivo", async () => {
    const { movimientos, tools } = await personaConTools({ status: 503 });

    const resultado = await tools.registrar_movimiento.execute!(
      { tipo: "gasto", monto: 20, moneda: "USD", categoria: "ocio", medioDePago: "credito", descripcion: "Steam" },
      opciones
    );

    expect(resultado).toMatchObject({ ok: false, motivo: "servicio" });
    expect(await movimientos.listar(septiembre)).toEqual([]);
  });

  it("una categoría que no es de ese tipo no se guarda: devuelve qué está mal para que el modelo corrija", async () => {
    const { movimientos, tools } = await personaConTools();

    const resultado = await tools.registrar_movimiento.execute!(
      { tipo: "gasto", monto: 1000, moneda: "ARS", categoria: "sueldo", medioDePago: "efectivo", descripcion: "Algo" },
      opciones
    );

    expect(resultado).toMatchObject({
      ok: false,
      motivo: "datos_invalidos",
      detalle: expect.stringMatching(/categoría/),
    });
    expect(await movimientos.listar(septiembre)).toEqual([]);
  });
});

describe("consultar_movimientos, estadisticas y borrar_movimiento", () => {
  /** Una persona con un ingreso y dos gastos en septiembre y un gasto en agosto. */
  async function personaConDatos() {
    const datos = await personaConTools();
    const base = { moneda: "ARS" as const, medioDePago: "debito" as const };
    for (const movimiento of [
      {
        ...base,
        tipo: "ingreso" as const,
        monto: 500000,
        categoria: "sueldo" as const,
        descripcion: "Sueldo",
        fecha: "2026-09-05",
      },
      {
        ...base,
        tipo: "gasto" as const,
        monto: 60000,
        categoria: "supermercado" as const,
        descripcion: "Súper",
        fecha: "2026-09-10",
      },
      {
        ...base,
        tipo: "gasto" as const,
        monto: 30000,
        categoria: "transporte" as const,
        descripcion: "SUBE",
        fecha: "2026-09-12",
      },
      {
        ...base,
        tipo: "gasto" as const,
        monto: 45000,
        categoria: "supermercado" as const,
        descripcion: "Súper",
        fecha: "2026-08-20",
      },
    ]) {
      await datos.tools.registrar_movimiento.execute!(movimiento, opciones);
    }
    return datos;
  }

  it("consultar_movimientos: sin período es el mes de hoy, con los movimientos y el resumen", async () => {
    const { tools } = await personaConDatos();

    const resultado = (await tools.consultar_movimientos.execute!({}, opciones)) as MovimientosConsultados;

    expect(resultado).toMatchObject({
      ok: true,
      periodo: septiembre,
      resumen: { ingresos: 500000, gastos: 90000, balance: 410000 },
    });
    expect(resultado.ok && resultado.movimientos.map((m) => m.descripcion)).toEqual(["SUBE", "Súper", "Sueldo"]);
  });

  it("consultar_movimientos filtra por tipo y categoría", async () => {
    const { tools } = await personaConDatos();

    const resultado = (await tools.consultar_movimientos.execute!(
      { periodo: { unidad: "mes", referencia: "2026-08-01" }, categoria: "supermercado" },
      opciones
    )) as MovimientosConsultados;

    expect(resultado).toMatchObject({ ok: true, resumen: { gastos: 45000 } });
    expect(resultado.ok && resultado.movimientos).toHaveLength(1);
  });

  it("estadisticas: totales por categoría y la variación de gastos contra el mes anterior", async () => {
    const { tools } = await personaConDatos();

    const resultado = await tools.estadisticas.execute!({}, opciones);

    expect(resultado).toMatchObject({
      ok: true,
      estadisticas: {
        periodo: septiembre,
        resumen: { gastos: 90000 },
        porCategoria: [
          { tipo: "gasto", categoria: "supermercado", total: 60000, porcentaje: 66.67 },
          { tipo: "gasto", categoria: "transporte", total: 30000, porcentaje: 33.33 },
          { tipo: "ingreso", categoria: "sueldo", total: 500000, porcentaje: 100 },
        ],
        promedioDiarioDeGastos: 3000,
        variacionDeGastos: { anterior: 45000, porcentaje: 100 },
      },
    });
  });

  it("un rango al revés no rompe la tool: devuelve qué está mal", async () => {
    const { tools } = await personaConTools();

    expect(
      await tools.estadisticas.execute!({ periodo: { desde: "2026-09-10", hasta: "2026-09-01" } }, opciones)
    ).toMatchObject({ ok: false, motivo: "datos_invalidos" });
  });

  it("borrar_movimiento borra uno propio; uno que no existe (o de otra persona) avisa que no lo encontró", async () => {
    const { tools, movimientos } = await personaConDatos();
    const [primero] = await movimientos.listar(septiembre);

    expect(await tools.borrar_movimiento.execute!({ id: primero.id }, opciones)).toEqual({ ok: true });
    expect(await tools.borrar_movimiento.execute!({ id: primero.id }, opciones)).toMatchObject({
      ok: false,
      motivo: "no_encontrado",
    });
    expect(await movimientos.listar(septiembre)).toHaveLength(2);
  });
});

describe("convertir", () => {
  it("de dólares a pesos y de pesos a dólares, con la compra y la venta del tipo pedido", async () => {
    const { tools } = await personaConTools();

    expect(await tools.convertir.execute!({ monto: 100, de: "USD", tipoDeDolar: "blue" }, opciones)).toEqual({
      ok: true,
      monto: 100,
      de: "USD",
      a: "ARS",
      tipoDeDolar: "blue",
      conCompra: 154000,
      conVenta: 156000,
      actualizada: "2026-09-17T17:00:00.000Z",
    });
    expect(await tools.convertir.execute!({ monto: 156000, de: "ARS", tipoDeDolar: "blue" }, opciones)).toMatchObject({
      ok: true,
      a: "USD",
      conCompra: 101.3,
      conVenta: 100,
    });
  });
});

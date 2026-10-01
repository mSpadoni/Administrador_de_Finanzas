import { describe, expect, it } from "vitest";
import { MovimientosServicio, type EntradaDeMovimiento } from "@/backend/servicios/movimientos.servicio";
import type { CotizacionUsada, DatosDeMovimiento } from "@/backend/models/dominio/movimiento";
import type { MovimientosModel } from "@/backend/models/repositorios/movimientos.model";

// Qué es un movimiento válido (CONTEXT.md), probado por el caso de uso que lo registra: lo que no vale vuelve como
// `datos_invalidos` (el asistente lo corrige) y no llega al repositorio. El repositorio es un doble en memoria; que se
// guarde de verdad se prueba contra la base en integracion/.

const GASTO: EntradaDeMovimiento = {
  tipo: "gasto",
  monto: 15000,
  moneda: "ARS",
  categoria: "supermercado",
  medioDePago: "debito",
  descripcion: "Compra del súper",
  fecha: "2026-09-29",
};

/** Un servicio con un repositorio en memoria que anota lo que se le pidió guardar. */
function servicioConRepositorioFalso() {
  const guardados: DatosDeMovimiento[] = [];
  const repositorio = {
    registrar: async (datos: DatosDeMovimiento, cotizacion: CotizacionUsada | null) => {
      guardados.push(datos);
      return { ...datos, id: "m1", montoEnPesos: datos.monto, cotizacion };
    },
  } as unknown as MovimientosModel;
  // El dólar no se usa (todo es en pesos): si se usara, un cliente real iría a internet, y eso haría fallar el test.
  const servicio = new MovimientosServicio(
    () => repositorio,
    undefined,
    () => "2026-09-29"
  );
  return { servicio, guardados };
}

/** Registra `entrada` y devuelve el detalle del error (o null si se guardó) y cuántas cosas llegaron al repositorio. */
async function registrar(entrada: EntradaDeMovimiento) {
  const { servicio, guardados } = servicioConRepositorioFalso();
  const resultado = await servicio.registrar(entrada);
  return { resultado, guardados };
}

describe("MovimientosServicio.registrar — qué es un movimiento válido", () => {
  it("un gasto y un ingreso bien formados se guardan", async () => {
    const ingreso: EntradaDeMovimiento = {
      ...GASTO,
      tipo: "ingreso",
      categoria: "sueldo",
      medioDePago: "transferencia",
    };

    expect((await registrar(GASTO)).resultado).toMatchObject({ ok: true });
    expect((await registrar(ingreso)).resultado).toMatchObject({ ok: true });
  });

  it("cada tipo tiene sus categorías: una de ingreso no vale para un gasto, ni al revés; «otros» vale para los dos", async () => {
    for (const cruzado of [
      { ...GASTO, categoria: "sueldo" as const },
      { ...GASTO, tipo: "ingreso" as const, categoria: "supermercado" as const },
    ]) {
      const { resultado, guardados } = await registrar(cruzado);
      expect(resultado).toEqual({
        ok: false,
        motivo: "datos_invalidos",
        detalle: "La categoría no corresponde al tipo de movimiento.",
      });
      expect(guardados).toEqual([]);
    }
    expect((await registrar({ ...GASTO, categoria: "otros" })).resultado).toMatchObject({ ok: true });
    expect((await registrar({ ...GASTO, tipo: "ingreso", categoria: "otros" })).resultado).toMatchObject({ ok: true });
  });

  it.each([
    [0, "El monto tiene que ser mayor que cero."],
    [-10, "El monto tiene que ser mayor que cero."],
    [12.345, "El monto puede tener a lo sumo dos decimales."],
  ])("un monto de %s no es plata válida: «%s»", async (monto, detalle) => {
    const { resultado, guardados } = await registrar({ ...GASTO, monto });

    expect(resultado).toEqual({ ok: false, motivo: "datos_invalidos", detalle });
    expect(guardados).toEqual([]);
  });

  it("el monto más chico (0,01) y uno con dos decimales se aceptan", async () => {
    expect((await registrar({ ...GASTO, monto: 0.01 })).resultado).toMatchObject({ ok: true });
    expect((await registrar({ ...GASTO, monto: 19.99 })).resultado).toMatchObject({ ok: true });
  });

  it.each(["2026-09-29T10:00:00Z", "29/09/2026", "2026-02-30", "2026-13-01"])(
    "la fecha es un día del calendario (AAAA-MM-DD): «%s» no vale",
    async (fecha) => {
      const { resultado, guardados } = await registrar({ ...GASTO, fecha });

      expect(resultado).toMatchObject({ ok: false, motivo: "datos_invalidos" });
      expect(guardados).toEqual([]);
    }
  );

  it("sin fecha, el movimiento es de hoy", async () => {
    const { guardados } = await registrar({ ...GASTO, fecha: undefined });

    expect(guardados[0].fecha).toBe("2026-09-29");
  });

  it("la descripción no puede estar vacía, se guarda sin espacios de más y tiene hasta 200 caracteres", async () => {
    expect((await registrar({ ...GASTO, descripcion: "   " })).resultado).toEqual({
      ok: false,
      motivo: "datos_invalidos",
      detalle: "La descripción está vacía.",
    });
    expect((await registrar({ ...GASTO, descripcion: "  Súper  " })).guardados[0].descripcion).toBe("Súper");
    expect((await registrar({ ...GASTO, descripcion: "x".repeat(200) })).resultado).toMatchObject({ ok: true });
    expect((await registrar({ ...GASTO, descripcion: "x".repeat(201) })).resultado).toMatchObject({
      ok: false,
      motivo: "datos_invalidos",
    });
  });
});

describe("MovimientosServicio — «hasta» sin «desde»", () => {
  it("las estadísticas y la consulta piden el «desde», y le sugieren al asistente ofrecer «desde hoy»", async () => {
    const { servicio } = servicioConRepositorioFalso();
    const esperado = {
      ok: false,
      motivo: "datos_invalidos",
      detalle:
        "Falta desde cuándo. Preguntale a la persona desde qué día quiere ver y ofrecele «desde hoy» para que no tenga que decir una fecha.",
    };

    expect(await servicio.estadisticas({ hasta: "2026-10-31" })).toEqual(esperado);
    expect(await servicio.consultar({ periodo: { hasta: "2026-10-31" } })).toEqual(esperado);
  });

  it("«desde hoy» hasta una fecha futura es un rango válido", async () => {
    const listar = async () => [];
    const servicio = new MovimientosServicio(
      () => ({ listar }) as unknown as MovimientosModel,
      undefined,
      () => "2026-09-29"
    );

    expect(await servicio.consultar({ periodo: { desde: "2026-09-29", hasta: "2026-10-31" } })).toMatchObject({
      ok: true,
      periodo: { desde: "2026-09-29", hasta: "2026-10-31" },
    });
  });
});

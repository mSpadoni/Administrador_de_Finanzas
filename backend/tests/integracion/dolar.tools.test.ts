import { afterEach, describe, expect, it } from "vitest";
import { ClienteDolar, type ResultadoCotizaciones } from "@/backend/lib/dolar";
import { crearToolsDolar } from "@/backend/tools/dolar.tools";
import { levantarServidor, type ServidorLocal } from "../helpers/servidorHttpLocal";

// La tool cotizacion_dolar tal como la llama el modelo, contra un servidor HTTP local que responde como dolarapi.com.
// Cómo se maneja cada respuesta del servicio (reintentos, caché, validación) se prueba en dolar.test.ts.

const casa = (casa: string, compra: number, venta: number) => ({
  moneda: "USD",
  casa,
  nombre: casa,
  compra,
  venta,
  fechaActualizacion: "2026-09-29T17:00:00.000Z",
});
const DOLARES = [
  casa("oficial", 1495, 1545),
  casa("blue", 1540, 1560),
  casa("bolsa", 1537.4, 1557),
  casa("tarjeta", 1943.5, 2008.5),
];
const opciones = { toolCallId: "t", messages: [], context: {} };

let servidor: ServidorLocal | undefined;
afterEach(async () => {
  await servidor?.cerrar();
  servidor = undefined;
});

async function toolContra(status: number, cuerpo = "") {
  servidor = await levantarServidor(() => ({ status, headers: { "content-type": "application/json" }, cuerpo }));
  return crearToolsDolar(new ClienteDolar({ endpoint: servidor.url, reintentos: 0 })).cotizacion_dolar;
}

describe("cotizacion_dolar", () => {
  it("sin tipo, devuelve todos los tipos de dólar con compra y venta", async () => {
    const herramienta = await toolContra(200, JSON.stringify(DOLARES));

    const resultado = (await herramienta.execute!({}, opciones)) as ResultadoCotizaciones;

    expect(resultado).toMatchObject({ ok: true });
    expect(resultado.ok && resultado.cotizaciones.map((c) => c.tipoDeDolar)).toEqual([
      "oficial",
      "blue",
      "mep",
      "tarjeta",
    ]);
  });

  it("con un tipo, devuelve solo ese", async () => {
    const herramienta = await toolContra(200, JSON.stringify(DOLARES));

    expect(await herramienta.execute!({ tipoDeDolar: "blue" }, opciones)).toEqual({
      ok: true,
      cotizaciones: [{ tipoDeDolar: "blue", compra: 1540, venta: 1560, actualizada: "2026-09-29T17:00:00.000Z" }],
    });
  });

  it("si el servicio falla, devuelve el motivo (el modelo se lo explica a la persona)", async () => {
    const herramienta = await toolContra(503);

    expect(await herramienta.execute!({}, opciones)).toMatchObject({ ok: false, motivo: "servicio" });
  });
});

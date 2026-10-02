import { describe, expect, it } from "vitest";
import { montoEnPesos, valorDeCotizacion, type DatosDeMovimiento } from "@/backend/models/dominio/movimiento";
import { ErrorDeDominio } from "@/backend/models/dominio/erroresDominio";

// Cómo se calcula el monto en pesos de un movimiento (docs/adr/0001). Lógica pura. Qué es un movimiento válido se prueba
// por el caso de uso que lo registra (movimientos.servicio.test.ts).

const GASTO: DatosDeMovimiento = {
  tipo: "gasto",
  monto: 15000,
  moneda: "ARS",
  categoria: "supermercado",
  medioDePago: "debito",
  descripcion: "Compra del súper",
  fecha: "2026-09-29",
};

describe("montoEnPesos", () => {
  it("en pesos es el mismo monto, sin cotización", () => {
    expect(montoEnPesos(GASTO, null)).toBe(15000);
  });

  it("en dólares es el monto por la cotización usada, redondeado al centavo", () => {
    const enDolares = { ...GASTO, moneda: "USD" as const, monto: 20.5 };

    expect(montoEnPesos(enDolares, { tipoDeDolar: "oficial", valor: 1432.37 })).toBe(29363.59);
  });

  it("un movimiento en dólares sin cotización, o uno en pesos con cotización, es un error de quien llama", () => {
    const enDolares = { ...GASTO, moneda: "USD" as const };

    expect(() => montoEnPesos(enDolares, null)).toThrow(ErrorDeDominio);
    expect(() => montoEnPesos(enDolares, null)).toThrow(/en dólares necesita la cotización/);
    expect(() => montoEnPesos(GASTO, { tipoDeDolar: "blue", valor: 1400 })).toThrow(ErrorDeDominio);
    expect(() => montoEnPesos(GASTO, { tipoDeDolar: "blue", valor: 1400 })).toThrow(/en pesos no lleva cotización/);
  });
});

describe("valorDeCotizacion", () => {
  const blue = { compra: 1540, venta: 1560 };

  it("un gasto en dólares se pasa a pesos con el valor de venta (lo que cuesta comprar el dólar)", () => {
    expect(valorDeCotizacion("gasto", blue)).toBe(1560);
  });

  it("un ingreso en dólares, con el de compra (lo que te dan al venderlo)", () => {
    expect(valorDeCotizacion("ingreso", blue)).toBe(1540);
  });
});

import { describe, expect, it } from "vitest";
import {
  CATEGORIAS,
  DatosDeMovimientoSchema,
  montoEnPesos,
  type DatosDeMovimiento,
} from "@/backend/models/dominio/movimiento";

// Qué es un movimiento válido (CONTEXT.md) y cómo se calcula su monto en pesos (docs/adr/0001). Lógica pura.

const GASTO: DatosDeMovimiento = {
  tipo: "gasto",
  monto: 15000,
  moneda: "ARS",
  categoria: "supermercado",
  medioDePago: "debito",
  descripcion: "Compra del súper",
  fecha: "2026-09-29",
};

describe("DatosDeMovimientoSchema", () => {
  it("acepta un gasto y un ingreso bien formados", () => {
    const ingreso = { ...GASTO, tipo: "ingreso", categoria: "sueldo", medioDePago: "transferencia" };

    expect(DatosDeMovimientoSchema.parse(GASTO)).toEqual(GASTO);
    expect(DatosDeMovimientoSchema.safeParse(ingreso).success).toBe(true);
  });

  it("cada tipo tiene su lista de categorías: una de ingreso no vale para un gasto, ni al revés", () => {
    expect(DatosDeMovimientoSchema.safeParse({ ...GASTO, categoria: "sueldo" }).success).toBe(false);
    expect(DatosDeMovimientoSchema.safeParse({ ...GASTO, tipo: "ingreso" }).success).toBe(false);
    expect(DatosDeMovimientoSchema.safeParse({ ...GASTO, categoria: "otros" }).success).toBe(true);
    expect(CATEGORIAS.gasto).toContain("otros");
    expect(CATEGORIAS.ingreso).toContain("otros");
  });

  it("rechaza montos que no son plata: cero, negativos o con más de dos decimales", () => {
    for (const monto of [0, -10, 12.345]) {
      expect(DatosDeMovimientoSchema.safeParse({ ...GASTO, monto }).success, String(monto)).toBe(false);
    }
    expect(DatosDeMovimientoSchema.safeParse({ ...GASTO, monto: 19.99 }).success).toBe(true);
  });

  it("la fecha es un día del calendario (AAAA-MM-DD), no una fecha con hora ni un día que no existe", () => {
    for (const fecha of ["2026-09-29T10:00:00Z", "29/09/2026", "2026-02-30"]) {
      expect(DatosDeMovimientoSchema.safeParse({ ...GASTO, fecha }).success, fecha).toBe(false);
    }
  });

  it("la descripción no puede estar vacía y se guarda sin espacios de más", () => {
    expect(DatosDeMovimientoSchema.safeParse({ ...GASTO, descripcion: "   " }).success).toBe(false);
    expect(DatosDeMovimientoSchema.parse({ ...GASTO, descripcion: "  Súper  " }).descripcion).toBe("Súper");
  });
});

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

    expect(() => montoEnPesos(enDolares, null)).toThrow(/cotización/);
    expect(() => montoEnPesos(GASTO, { tipoDeDolar: "blue", valor: 1400 })).toThrow(/cotización/);
  });
});

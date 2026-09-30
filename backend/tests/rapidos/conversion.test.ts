import { describe, expect, it } from "vitest";
import { convertirMonto, monedaDestino } from "@/backend/models/dominio/conversion";

// Convertir un monto entre pesos y dólares con un valor de cotización. Lógica pura.

describe("monedaDestino", () => {
  it("los dólares van a pesos y los pesos a dólares", () => {
    expect(monedaDestino("USD")).toBe("ARS");
    expect(monedaDestino("ARS")).toBe("USD");
  });
});

describe("convertirMonto", () => {
  it("de dólares a pesos multiplica por la cotización, redondeado al centavo", () => {
    expect(convertirMonto(20.5, "USD", 1432.37)).toBe(29363.59);
  });

  it("de pesos a dólares divide por la cotización, con dos decimales", () => {
    expect(convertirMonto(500_000, "ARS", 1250)).toBe(400);
    expect(convertirMonto(100, "ARS", 3)).toBe(33.33);
  });
});

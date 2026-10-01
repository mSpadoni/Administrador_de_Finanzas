import { describe, expect, it } from "vitest";
import { tituloDesde } from "@/shared/conversaciones";

// El título de una conversación (lo arma el servidor al guardarla y el sidebar al mostrarla). Lógica pura.

describe("tituloDesde", () => {
  it("usa el primer mensaje en una sola línea, sin espacios de más", () => {
    expect(tituloDesde("  ¿Cuánto gasté\n este mes?  ")).toBe("¿Cuánto gasté este mes?");
  });

  it("recorta los largos a 60 caracteres, terminando en «…»", () => {
    const largo = tituloDesde("a".repeat(100));

    expect(largo).toHaveLength(60);
    expect(largo.endsWith("…")).toBe(true);
  });

  it("sin texto útil, es «Conversación nueva»", () => {
    expect(tituloDesde("   ")).toBe("Conversación nueva");
  });
});

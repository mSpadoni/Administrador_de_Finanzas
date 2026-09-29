import { describe, expect, it } from "vitest";
import { armarSystemPrompt } from "@/backend/lib/prompts/systemPrompt";

// El prompt del asistente: lo que no puede faltar para que las fechas relativas ("ayer", "este mes") se entiendan.

describe("armarSystemPrompt", () => {
  it("le dice al modelo qué día es hoy en Argentina", () => {
    expect(armarSystemPrompt("2026-09-29")).toContain("Hoy es 2026-09-29");
  });
});

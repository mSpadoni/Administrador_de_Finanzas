import { describe, expect, it } from "vitest";
import { lanzarPorFalloAlCrearConversacion } from "@/backend/controllers/erroresControllers";
import { ErrorDeAplicacion } from "@/backend/erroresBackend";
import { ErrorDeBase } from "@/backend/lib/supabase/erroresSupabase";

// Qué pasa cuando falla la creación de una conversación nueva: solo «ya existe ese id» (es de otra persona) es un 404.

describe("lanzarPorFalloAlCrearConversacion", () => {
  it("si el id ya existe (clave duplicada), la conversación es de otra persona: no encontrada", () => {
    const duplicada = new ErrorDeBase("No se pudo crear la conversación: duplicate key", "23505");

    expect.assertions(3);
    try {
      lanzarPorFalloAlCrearConversacion(duplicada);
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorDeAplicacion);
      expect((error as ErrorDeAplicacion).codigo).toBe("conversacion_no_encontrada");
      expect((error as ErrorDeAplicacion).cause).toBe(duplicada);
    }
  });

  it("cualquier otra falla de la base sigue de largo, sin disfrazarla de conversación no encontrada", () => {
    const caida = new ErrorDeBase("No se pudo crear la conversación: connection refused");

    expect(() => lanzarPorFalloAlCrearConversacion(caida)).toThrow(caida);
  });

  it("un error que no es de la base tampoco se disfraza", () => {
    const bug = new TypeError("algo se rompió");

    expect(() => lanzarPorFalloAlCrearConversacion(bug)).toThrow(bug);
  });
});

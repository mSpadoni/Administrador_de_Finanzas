import { describe, expect, it } from "vitest";
import { ErrorDeBase, esClaveDuplicada } from "@/backend/lib/supabase/erroresSupabase";
import { ConversacionYaExisteError, lanzarFalloAlCrearConversacion } from "@/backend/models/repositorios/erroresRepositorios";

// Qué pasa cuando falla la creación de una conversación: solo «ya existe ese id» es esperable; lo demás sigue de largo.

describe("esClaveDuplicada", () => {
  it("reconoce el código de Postgres de clave duplicada y nada más", () => {
    expect(esClaveDuplicada(new ErrorDeBase("duplicate key", "23505"))).toBe(true);
    expect(esClaveDuplicada(new ErrorDeBase("RLS", "42501"))).toBe(false);
    expect(esClaveDuplicada(new ErrorDeBase("sin código"))).toBe(false);
    expect(esClaveDuplicada(new TypeError("otro error"))).toBe(false);
  });
});

describe("lanzarFalloAlCrearConversacion", () => {
  it("si el id ya existe, lanza ConversacionYaExisteError con la causa original", () => {
    const duplicada = new ErrorDeBase("No se pudo crear la conversación: duplicate key", "23505");

    expect.assertions(3);
    try {
      lanzarFalloAlCrearConversacion(duplicada);
    } catch (error) {
      expect(error).toBeInstanceOf(ConversacionYaExisteError);
      expect((error as Error).message).toContain("No se pudo crear la conversación");
      expect((error as Error).cause).toBe(duplicada);
    }
  });

  it("cualquier otra falla sigue de largo sin disfrazarse", () => {
    const caida = new ErrorDeBase("No se pudo crear la conversación: connection refused");
    const bug = new TypeError("algo se rompió");

    expect(() => lanzarFalloAlCrearConversacion(caida)).toThrow(caida);
    expect(() => lanzarFalloAlCrearConversacion(bug)).toThrow(bug);
  });
});

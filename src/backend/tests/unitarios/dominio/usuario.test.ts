import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { Usuario } from "@/backend/models/dominio/usuario";

// Cómo se arma el Usuario con lo que manda Supabase Auth después del login con Google. Lógica pura: un `User` literal.

const usuarioDeSupabase = (metadata: Record<string, unknown>): User =>
  ({ id: "u1", email: "mateo@ejemplo.com", user_metadata: metadata }) as unknown as User;

describe("Usuario.desdeSupabase", () => {
  it("con nombre, se muestra el nombre y se saluda con la primera palabra", () => {
    const usuario = Usuario.desdeSupabase(usuarioDeSupabase({ full_name: "Mateo Spadoni" }));

    expect(usuario.nombreVisible).toBe("Mateo Spadoni");
    expect(usuario.primerNombre).toBe("Mateo");
  });

  it("si Google manda el nombre vacío (o solo espacios), es como si no hubiera nombre: se usa el email", () => {
    for (const full_name of ["", "   "]) {
      const usuario = Usuario.desdeSupabase(usuarioDeSupabase({ full_name }));

      expect(usuario.nombre).toBeNull();
      expect(usuario.nombreVisible).toBe("mateo@ejemplo.com");
      expect(usuario.primerNombre).toBe("mateo");
    }
  });
});

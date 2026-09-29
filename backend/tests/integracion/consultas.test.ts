import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { datosOError } from "@/backend/lib/supabase/consultas";
import { borrarUsuariosDePrueba, crearUsuarioLogueado, NavegadorDePrueba } from "../helpers/usuarioDePrueba";

// Sin mocks: consultas reales a la copia local de Supabase (Docker).
afterAll(borrarUsuariosDePrueba);

describe("datosOError", () => {
  it("si la consulta sale bien, devuelve sus datos", async () => {
    const usuario = await crearUsuarioLogueado();
    const supabase = await usuario.navegador.crearCliente();

    const conversaciones = datosOError(
      await supabase.from("conversaciones").select("id").limit(1),
      "No se pudieron leer las conversaciones"
    );

    expect(conversaciones).toEqual([]);
  });

  it("si Supabase responde un error (acá, sin sesión: anon no tiene acceso a la tabla), lo tira con qué se estaba haciendo", async () => {
    const supabase = await new NavegadorDePrueba().crearCliente();

    const respuesta = await supabase.from("conversaciones").insert({ id: randomUUID(), titulo: "Anónima" });

    expect(() => datosOError(respuesta, "No se pudo crear la conversación")).toThrow(
      /^No se pudo crear la conversación: .*permission denied/
    );
  });
});

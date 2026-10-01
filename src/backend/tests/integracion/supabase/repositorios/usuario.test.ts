// Cómo se lee un test de Vitest:
// - describe("tema", () => {...}): agrupa tests relacionados.
// - it("qué debería pasar", async () => {...}): un test (async porque habla con la base local de Supabase).
// - expect(valor).toBe(esperado): compara. Otros: toEqual (mismo contenido), toMatchObject (al menos esas propiedades)...
// - afterAll(fn): corre `fn` una vez al terminar todos los tests del archivo (acá, borra los personas de prueba).
import { afterAll, describe, expect, it } from "vitest";
import { Usuario } from "@/backend/models/dominio/usuario";
import { borrarUsuariosDePrueba, crearUsuarioLogueado } from "@/backend/tests/helpers/supabase/usuarioDePrueba";

afterAll(borrarUsuariosDePrueba);

// Los usuarios salen de la base local (auth.getUser), no de objetos armados a mano.
// `Parameters<typeof f>[0]`: "el tipo del primer parámetro de la función f" (así no hay que repetirlo).
// `data.user!`: el `!` le dice a TypeScript "confiá, acá no es null".
async function usuarioDeSupabase(datosDeGoogle: Parameters<typeof crearUsuarioLogueado>[0]) {
  const persona = await crearUsuarioLogueado(datosDeGoogle);
  const cliente = await persona.navegador.crearCliente();
  const { data } = await cliente.auth.getUser();
  return { persona, user: data.user! };
}

describe("Usuario.desdeSupabase", () => {
  it("toma nombre y foto de full_name y avatar_url", async () => {
    const { persona, user } = await usuarioDeSupabase({
      full_name: "Ana Pérez",
      avatar_url: "https://ejemplo.com/ana.png",
    });

    const usuario = Usuario.desdeSupabase(user);

    expect(usuario).toEqual(new Usuario(persona.id, persona.email, "Ana Pérez", "https://ejemplo.com/ana.png"));
  });

  it("usa name y picture si Google no mandó full_name ni avatar_url", async () => {
    const { user } = await usuarioDeSupabase({ name: "Beto", picture: "https://ejemplo.com/beto.png" });

    const usuario = Usuario.desdeSupabase(user);

    expect(usuario.nombre).toBe("Beto");
    expect(usuario.avatarUrl).toBe("https://ejemplo.com/beto.png");
  });

  it("primerNombre toma la primera palabra del nombre (para el saludo del chat)", async () => {
    const { user } = await usuarioDeSupabase({ full_name: "  Mateo   Spadoni " });

    expect(Usuario.desdeSupabase(user).primerNombre).toBe("Mateo");
  });

  it("sin nombre, primerNombre usa la parte del email antes de la @", async () => {
    const { persona, user } = await usuarioDeSupabase({});

    expect(Usuario.desdeSupabase(user).primerNombre).toBe(persona.email.split("@")[0]);
  });

  it("sin nombre, nombreVisible muestra el email", async () => {
    const { persona, user } = await usuarioDeSupabase({});

    const usuario = Usuario.desdeSupabase(user);

    expect(usuario.nombre).toBeNull();
    expect(usuario.avatarUrl).toBeNull();
    expect(usuario.nombreVisible).toBe(persona.email);
  });
});

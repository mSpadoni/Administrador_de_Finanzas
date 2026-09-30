// Cómo se lee un test de Vitest:
// - describe("tema", () => {...}): agrupa tests relacionados.
// - it("qué debería pasar", async () => {...}): un test (async porque habla con la base local de Supabase).
// - expect(valor).toBe(esperado): compara. Otros: toEqual (mismo contenido), toMatchObject (al menos esas propiedades)...
// - afterAll(fn): corre `fn` una vez al terminar todos los tests del archivo (acá, borra los personas de prueba).
import { afterAll, describe, expect, it } from "vitest";
import { AuthController } from "@/backend/controllers/auth.controller";
import { Usuario } from "@/backend/models/dominio/usuario";
import { AuthModel } from "@/backend/models/repositorios/auth.model";
import { borrarUsuariosDePrueba, crearUsuarioLogueado, NavegadorDePrueba } from "../helpers/usuarioDePrueba";

afterAll(borrarUsuariosDePrueba);

describe("AuthController.obtenerUsuarioActual", () => {
  it("devuelve null si el persona no inició sesión", async () => {
    const controller = new AuthController(() => new AuthModel(new NavegadorDePrueba().crearCliente));

    expect(await controller.obtenerUsuarioActual()).toBeNull();
  });

  it("devuelve al persona logueado con los datos que manda Google (lo que muestra 'Hola, <nombre>')", async () => {
    const persona = await crearUsuarioLogueado({
      full_name: "Mateo Spadoni",
      avatar_url: "https://ejemplo.com/mateo.png",
    });
    const controller = new AuthController(() => new AuthModel(persona.navegador.crearCliente));

    const usuario = await controller.obtenerUsuarioActual();

    expect(usuario).toBeInstanceOf(Usuario);
    expect(usuario).toMatchObject({
      id: persona.id,
      email: persona.email,
      nombre: "Mateo Spadoni",
      avatarUrl: "https://ejemplo.com/mateo.png",
    });
    expect(usuario?.nombreVisible).toBe("Mateo Spadoni");
  });

  it("mantiene la sesión entre requests (como al recargar la página)", async () => {
    const persona = await crearUsuarioLogueado();

    // Cada controller crea su cliente de cero, leyendo solo las cookies: igual que dos requests distintos.
    const primerRequest = await new AuthController(() => new AuthModel(persona.navegador.crearCliente)).obtenerUsuarioActual();
    const segundoRequest = await new AuthController(() => new AuthModel(persona.navegador.crearCliente)).obtenerUsuarioActual();

    expect(primerRequest?.id).toBe(persona.id);
    expect(segundoRequest?.id).toBe(persona.id);
  });

  it("no mezcla sesiones: cada navegador ve a su propio persona", async () => {
    const ana = await crearUsuarioLogueado({ full_name: "Ana" });
    const beto = await crearUsuarioLogueado({ full_name: "Beto" });

    const vistoPorAna = await new AuthController(() => new AuthModel(ana.navegador.crearCliente)).obtenerUsuarioActual();
    const vistoPorBeto = await new AuthController(() => new AuthModel(beto.navegador.crearCliente)).obtenerUsuarioActual();

    expect(vistoPorAna?.nombre).toBe("Ana");
    expect(vistoPorBeto?.nombre).toBe("Beto");
  });
});

describe("AuthController.cerrarSesion", () => {
  it("después de cerrar sesión, el siguiente request ya no tiene persona", async () => {
    const persona = await crearUsuarioLogueado();
    const controller = new AuthController(() => new AuthModel(persona.navegador.crearCliente));

    await controller.cerrarSesion();

    expect(await controller.obtenerUsuarioActual()).toBeNull();
  });
});

describe("AuthController.urlDeLoginConGoogle", () => {
  it("arma la URL de Supabase → Google con el callback de la app y PKCE", async () => {
    const navegador = new NavegadorDePrueba();
    const controller = new AuthController(() => new AuthModel(navegador.crearCliente));

    const url = await controller.urlDeLoginConGoogle("http://localhost:3000/auth/callback");

    expect(url).not.toBeNull();
    const destino = new URL(url!);
    expect(destino.pathname).toBe("/auth/v1/authorize");
    expect(destino.searchParams.get("provider")).toBe("google");
    expect(destino.searchParams.get("redirect_to")).toBe("http://localhost:3000/auth/callback");
    expect(destino.searchParams.get("code_challenge_method")).toBe("s256");
    // SHA-256 del verificador en base64url: 43 caracteres.
    expect(destino.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // El verificador PKCE queda en las cookies para canjear el code en /auth/callback.
    expect(navegador.nombresDeCookies().some((nombre) => nombre.endsWith("code-verifier"))).toBe(true);
  });
});

describe("AuthController.completarLogin", () => {
  it("rechaza un code inválido y no deja sesión (la home muestra el aviso de error)", async () => {
    const navegador = new NavegadorDePrueba();
    const controller = new AuthController(() => new AuthModel(navegador.crearCliente));
    await controller.urlDeLoginConGoogle("http://localhost:3000/auth/callback");

    const ok = await controller.completarLogin("code-que-no-existe");

    expect(ok).toBe(false);
    expect(await controller.obtenerUsuarioActual()).toBeNull();
  });
});

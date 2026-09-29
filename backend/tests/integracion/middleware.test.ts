import { NextRequest } from "next/server";
import { afterAll, describe, expect, inject, it } from "vitest";
import { middleware } from "@/middleware";
import { borrarUsuariosDePrueba, crearUsuarioLogueado, vencimientoDeSesion } from "../helpers/usuarioDePrueba";
import { conVariablesAsync } from "../helpers/variablesDeEntorno";

// Sin mocks: el middleware real de Next con un request real, contra la base local de Supabase.
const { url, publishableKey } = inject("supabaseLocal");
afterAll(borrarUsuariosDePrueba);

/** NextResponse.next() marca la respuesta con este header: "seguí con el request normalmente". */
const dejaPasar = (respuesta: Response) => respuesta.headers.get("x-middleware-next") === "1";

describe("middleware", () => {
  it("si la sesión del usuario venció, la renueva, le devuelve las cookies nuevas y deja pasar el request", async () => {
    const usuario = await crearUsuarioLogueado();
    usuario.navegador.vencerSesion();
    const request = new NextRequest("http://localhost:3000/", {
      headers: { cookie: usuario.navegador.headerCookie() },
    });

    const respuesta = await conVariablesAsync({ SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: publishableKey }, () =>
      middleware(request)
    );

    const sesionNueva = respuesta.cookies.getAll().find((cookie) => /-auth-token(\.0)?$/.test(cookie.name));
    expect(dejaPasar(respuesta)).toBe(true);
    expect(sesionNueva).toBeDefined();
    // La vencida decía 1 (1970): la nueva trae un vencimiento posterior, así que Supabase la renovó.
    expect(vencimientoDeSesion(sesionNueva!.value)).toBeGreaterThan(1);
  });

  it("si falta la configuración de Supabase, no tumba el sitio: deja pasar el request", async () => {
    const respuesta = await conVariablesAsync({ SUPABASE_URL: undefined, SUPABASE_PUBLISHABLE_KEY: undefined }, () =>
      middleware(new NextRequest("http://localhost:3000/"))
    );

    expect(respuesta.status).toBe(200);
    expect(dejaPasar(respuesta)).toBe(true);
  });
});

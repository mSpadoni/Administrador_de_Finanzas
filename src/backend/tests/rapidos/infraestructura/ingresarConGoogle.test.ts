import { afterEach, describe, expect, it, vi } from "vitest";

// A dónde manda Google de vuelta después del login. Regresión: al mover el código a src/, la acción dejó de usar
// origenDeLaPeticion y, si el pedido no traía el header Origin, la vuelta apuntaba a http://localhost:3000 aunque la app
// estuviera en Vercel. Next (headers, redirect) y Supabase Auth (authController) se reemplazan por dobles.

const cabeceras = vi.hoisted(() => ({ actuales: new Headers() }));
const urlDeLogin = vi.hoisted(() => vi.fn<(vuelta: string) => Promise<string | null>>());

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => cabeceras.actuales }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/backend/controllers/auth.controller", () => ({
  authController: { urlDeLoginConGoogle: urlDeLogin, cerrarSesion: vi.fn() },
}));

const { ingresarConGoogle } = await import("@/app/auth/actions");

afterEach(() => urlDeLogin.mockReset());

describe("ingresarConGoogle", () => {
  it("sin header Origin, Google vuelve al host con el que llegó el pedido (no a localhost)", async () => {
    cabeceras.actuales = new Headers({ "x-forwarded-host": "mi-app.vercel.app", "x-forwarded-proto": "https" });
    urlDeLogin.mockResolvedValue("https://accounts.google.com/o/oauth2/auth?x=1");

    await expect(ingresarConGoogle()).rejects.toThrow("redirect:https://accounts.google.com/o/oauth2/auth?x=1");
    expect(urlDeLogin).toHaveBeenCalledWith("https://mi-app.vercel.app/auth/callback");
  });

  it("con header Origin, Google vuelve a ese origen", async () => {
    cabeceras.actuales = new Headers({ origin: "http://localhost:3001", host: "otro.com" });
    urlDeLogin.mockResolvedValue("https://accounts.google.com/o/oauth2/auth?x=2");

    await expect(ingresarConGoogle()).rejects.toThrow("redirect:");
    expect(urlDeLogin).toHaveBeenCalledWith("http://localhost:3001/auth/callback");
  });

  it("si Supabase no devuelve la URL de Google, vuelve al inicio con el aviso de login fallido", async () => {
    cabeceras.actuales = new Headers({ origin: "https://mi-app.vercel.app" });
    urlDeLogin.mockResolvedValue(null);

    await expect(ingresarConGoogle()).rejects.toThrow("redirect:/?error=login");
  });
});

// "use server": las funciones de este archivo son Server Actions. Corren en el servidor aunque se
// disparen desde un botón del navegador (Next.js hace el viaje de ida y vuelta solo).
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authController } from "@/backend/controllers/auth.controller";

/** Arranca el login: manda al usuario a la pantalla de Google (o de vuelta a "/" con error si falló). */
export async function ingresarConGoogle(): Promise<void> {
  // `origin` = dirección de la app (ej. http://localhost:3000), para armar la URL a la que Google vuelve después.
  // `(await headers()).get(...)`: primero espera los headers del request y después lee "origin".
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const urlDeGoogle = await authController.urlDeLoginConGoogle(`${origin}/auth/callback`);

  // redirect corta la función y manda al navegador a otra URL.
  redirect(urlDeGoogle ?? "/?error=login");
}

/** Cierra la sesión y vuelve a la pantalla de inicio. */
export async function cerrarSesion(): Promise<void> {
  await authController.cerrarSesion();
  redirect("/");
}

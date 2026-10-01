// "use server": las funciones de este archivo son Server Actions. Corren en el servidor aunque se
// disparen desde un botón del navegador (Next.js hace el viaje de ida y vuelta solo).
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authController } from "@/backend/controllers/auth.controller";
import { RUTA_DE_LOGIN_FALLIDO, RUTAS } from "@/shared/rutas";
import { origenDeLaPeticion } from "./origen";

/** Arranca el login: manda al usuario a la pantalla de Google (o de vuelta a "/" con error si falló). */
export async function ingresarConGoogle(): Promise<void> {
  // `origen` = dirección de la app, para armar la URL a la que Google vuelve después (ver origenDeLaPeticion: usa el
  // header Origin y, si no viene, el host con el que llegó el pedido; no cae en localhost estando en producción).
  // `await headers()`: primero espera los headers del request.
  const origen = origenDeLaPeticion(await headers());
  const urlDeGoogle = await authController.urlDeLoginConGoogle(`${origen}${RUTAS.vueltaDelLogin}`);

  // redirect corta la función y manda al navegador a otra URL.
  redirect(urlDeGoogle ?? RUTA_DE_LOGIN_FALLIDO);
}

/** Cierra la sesión y vuelve a la pantalla de inicio. */
export async function cerrarSesion(): Promise<void> {
  await authController.cerrarSesion();
  redirect(RUTAS.inicio);
}

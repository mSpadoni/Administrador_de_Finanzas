import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { ingresarConGoogle } from "@/app/auth/actions";
import { authController } from "@/backend/controllers/auth.controller";
import BienvenidaConLogin from "@/frontend/BienvenidaConLogin";

/** El valor de `?error=` con el que /auth/callback vuelve acá cuando falló el login. */
const ERROR_DE_LOGIN = "login";

/**
 * Props que Next.js le pasa a la página. `searchParams` son los parámetros de la URL
 * (ej. `/?error=login` → `{ error: "login" }`). En Next 15 llegan como Promise, por eso se hace `await`.
 */
type Props = {
  searchParams: Promise<{ error?: string }>;
};

/**
 * Página principal ("/"). Next.js exige que cada página se llame `page.tsx`: lo que la distingue es la carpeta, que
 * define la URL (este archivo es "/"; `conversacion/[id]/page.tsx` es "/conversacion/:id").
 * Es un Server Component: corre en el servidor, por eso puede ser `async` y consultar directamente quién está
 * logueado. Si hay usuario lo lleva a una conversación nueva; si no, muestra la bienvenida con el login.
 */
export default async function HomePage({ searchParams }: Props) {
  const usuario = await authController.obtenerUsuarioActual();
  const { error } = await searchParams;

  // Con sesión: una conversación nueva, con su propio id y su URL desde el principio.
  // (No se guarda en la base hasta el primer mensaje: las conversaciones vacías no ocupan lugar.)
  if (usuario) redirect(`/conversacion/${randomUUID()}`);

  // Sin sesión: pantalla de bienvenida con el botón de Google.
  return <BienvenidaConLogin ingresar={ingresarConGoogle} falloElLogin={error === ERROR_DE_LOGIN} />;
}

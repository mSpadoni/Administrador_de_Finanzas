import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { ingresarConGoogle } from "@/app/auth/actions";
import { authController } from "@/backend/controllers/auth.controller";
import LoginButton from "@/views/LoginButton";

/**
 * Props que Next.js le pasa a la página. `searchParams` son los parámetros de la URL
 * (ej. `/?error=login` → `{ error: "login" }`). En Next 15 llegan como Promise, por eso se hace `await`.
 */
type Props = {
  searchParams: Promise<{ error?: string }>;
};

/**
 * Página principal ("/"). Es un Server Component: corre en el servidor, por eso puede ser `async`
 * y consultar directamente quién está logueado. Si hay usuario lo lleva a una conversación nueva; si no, muestra el login.
 */
export default async function HomePage({ searchParams }: Props) {
  const usuario = await authController.obtenerUsuarioActual();
  const { error } = await searchParams;

  // Con sesión: una conversación nueva, con su propio id y su URL desde el principio.
  // (No se guarda en la base hasta el primer mensaje: las conversaciones vacías no ocupan lugar.)
  if (usuario) redirect(`/conversacion/${randomUUID()}`);

  // Sin sesión: pantalla de bienvenida con el botón de Google.
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Administrador de Finanzas</h1>
        <p className="mt-2 text-slate-700">
          Contale al asistente tus gastos e ingresos como se los contarías a alguien: los registra, te dice en qué se va
          la plata y a cuánto está el dólar.
        </p>

        {/* `condición && (<jsx>)`: si la condición es true muestra el bloque; si es false no muestra nada. */}
        {error === "login" && (
          <div role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-medium">
              <span aria-hidden="true">⚠ </span>
              No pudimos iniciar tu sesión.
            </p>
            <p className="mt-1">
              Probá ingresar de nuevo. Si cancelaste en la pantalla de Google, no pasa nada: volvé a intentarlo cuando
              quieras.
            </p>
          </div>
        )}

        <div className="mt-6">
          <p className="mb-4 text-sm text-slate-700">Ingresá con tu cuenta de Google para empezar.</p>
          <LoginButton accion={ingresarConGoogle} variante="ingresar" />
        </div>
      </div>
    </main>
  );
}

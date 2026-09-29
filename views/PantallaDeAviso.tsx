import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  titulo: string;
  children: ReactNode;
  /** Acción principal opcional (ej. "Reintentar"), antes del link al inicio. */
  accion?: ReactNode;
};

/**
 * Pantalla para cuando algo no salió como se esperaba (una página que falló, una que no existe): qué pasó, en
 * palabras del usuario, y una salida clara (heurística #9). Mismo marco que la pantalla de ingreso.
 */
export default function PantallaDeAviso({ titulo, children, accion }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
        <div className="mt-2 text-slate-700">{children}</div>
        <div className="mt-6 flex flex-wrap gap-3">
          {accion}
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-100"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}

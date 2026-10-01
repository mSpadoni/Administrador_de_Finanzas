import Link from "next/link";
import type { ReactNode } from "react";
import { RUTAS } from "@/shared/rutas";

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
      <div className="w-full rounded-2xl border border-borde bg-superficie p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-tinta">{titulo}</h1>
        <div className="mt-2 text-tinta-suave">{children}</div>
        <div className="mt-6 flex flex-wrap gap-3">
          {accion}
          <Link
            href={RUTAS.inicio}
            className="rounded-lg border border-borde-fuerte px-4 py-2 font-medium text-tinta hover:bg-superficie-suave"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}

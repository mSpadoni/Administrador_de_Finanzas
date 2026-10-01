"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useChatEnPantallaSiHay } from "../estado/ContextoDelChat";

/**
 * Avisa que el resumen del mes se está actualizando (después de que el asistente registró o borró un movimiento). La región
 * está siempre montada para que el lector de pantalla lo anuncie; a la vista es una línea chica que aparece y se va.
 */
export function AvisoDeActualizacion() {
  const actualizandoResumen = useChatEnPantallaSiHay()?.actualizandoResumen ?? false;
  return (
    <p role="status" className="min-h-4 text-xs text-tinta-suave">
      {actualizandoResumen ? "Actualizando…" : ""}
    </p>
  );
}

/** Si el resumen no se pudo leer: el aviso con qué hacer y un botón para volver a intentarlo sin recargar la página. */
export function ResumenNoDisponible() {
  const router = useRouter();
  const [reintentando, reintentar] = useTransition();
  return (
    <div role="alert" className="space-y-2 text-sm text-tinta">
      <p>No se pudo cargar el resumen del mes.</p>
      <button
        type="button"
        onClick={() => reintentar(() => router.refresh())}
        disabled={reintentando}
        aria-busy={reintentando}
        className="min-h-11 rounded-full border border-borde-control px-4 font-medium hover:bg-superficie-suave disabled:opacity-60"
      >
        {reintentando ? "Reintentando…" : "Reintentar"}
      </button>
    </div>
  );
}

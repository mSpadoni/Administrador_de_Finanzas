"use client";

import { useSyncExternalStore } from "react";

/**
 * ¿La pantalla cumple `consulta` (una media query, ej. "(max-width: 639px)")? Se actualiza si cambia (girar el celular,
 * achicar la ventana). En el servidor, y donde no hay matchMedia, es false.
 */
export function useCoincideConLaPantalla(consulta: string): boolean {
  return useSyncExternalStore(
    (avisar) => {
      if (typeof window.matchMedia !== "function") return () => undefined;
      const lista = window.matchMedia(consulta);
      lista.addEventListener?.("change", avisar);
      return () => lista.removeEventListener?.("change", avisar);
    },
    () => typeof window.matchMedia === "function" && window.matchMedia(consulta).matches,
    () => false
  );
}

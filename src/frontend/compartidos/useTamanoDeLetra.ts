"use client";

import { useCallback, useSyncExternalStore } from "react";
import { aplicarTamanoDeLetra, tamanoDeLetraActual, type TamanoDeLetra } from "./tamanoDeLetra";

/** Quienes muestran el tamaño elegido (por ejemplo, el menú de la cuenta en la barra y en el encabezado). */
const suscriptores = new Set<() => void>();

function suscribir(avisar: () => void) {
  suscriptores.add(avisar);
  return () => suscriptores.delete(avisar);
}

/** El tamaño de letra elegido y cómo cambiarlo. En el servidor siempre es «normal» (no hay navegador para leerlo). */
export function useTamanoDeLetra(): [TamanoDeLetra, (tamano: TamanoDeLetra) => void] {
  const tamano = useSyncExternalStore(suscribir, tamanoDeLetraActual, () => "normal" as const);
  const cambiar = useCallback((nuevo: TamanoDeLetra) => {
    aplicarTamanoDeLetra(nuevo);
    suscriptores.forEach((avisar) => avisar());
  }, []);
  return [tamano, cambiar];
}

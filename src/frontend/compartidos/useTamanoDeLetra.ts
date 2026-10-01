"use client";

import { useCallback, useSyncExternalStore } from "react";
import { aplicarTamanoDeLetra, LIMITES_DE_LETRA, tamanoDeLetraActual } from "./tamanoDeLetra";

/** Quienes muestran el tamaño elegido (por ejemplo, la barra mientras se mueve). */
const suscriptores = new Set<() => void>();

function suscribir(avisar: () => void) {
  suscriptores.add(avisar);
  return () => suscriptores.delete(avisar);
}

/** El porcentaje de letra elegido y cómo cambiarlo. En el servidor siempre es el normal (no hay navegador para leerlo). */
export function useTamanoDeLetra(): [number, (porcentaje: number) => void] {
  const porcentaje = useSyncExternalStore(suscribir, tamanoDeLetraActual, () => LIMITES_DE_LETRA.normal);
  const cambiar = useCallback((nuevo: number) => {
    aplicarTamanoDeLetra(nuevo);
    suscriptores.forEach((avisar) => avisar());
  }, []);
  return [porcentaje, cambiar];
}

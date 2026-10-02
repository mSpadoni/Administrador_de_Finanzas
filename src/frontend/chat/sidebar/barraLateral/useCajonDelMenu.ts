"use client";

import { useEffect, useRef } from "react";
import { useModal } from "@/frontend/compartidos/useModal";

/**
 * La barra lateral como cajón (en celular): mientras está abierta, el resto de la página queda inerte (el foco no se
 * escapa), el foco entra al primer link y Escape la cierra; al cerrarse, el foco vuelve a la hamburguesa del encabezado.
 * Devuelve las referencias para la barra y para su primer link. `setAbierto` tiene que ser estable (el del contexto de
 * paneles): si cambiara en cada render, el efecto se repetiría y el foco saltaría.
 */
export function useCajonDelMenu(abierto: boolean, setAbierto: (abierto: boolean) => void) {
  const barraRef = useRef<HTMLDivElement>(null);
  const primerLinkRef = useRef<HTMLAnchorElement>(null);
  useModal(barraRef, abierto);

  useEffect(() => {
    if (!abierto) return;
    primerLinkRef.current?.focus();
    const alPresionarTecla = (evento: KeyboardEvent) => evento.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alPresionarTecla);
    return () => {
      window.removeEventListener("keydown", alPresionarTecla);
      document.getElementById("boton-menu")?.focus();
    };
  }, [abierto, setAbierto]);

  return { barraRef, primerLinkRef };
}

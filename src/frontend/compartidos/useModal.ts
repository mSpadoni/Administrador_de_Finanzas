"use client";

import { useEffect, type RefObject } from "react";

/** Marca para lo que tiene que seguir andando aunque el resto de la página quede inerte (ej. el fondo oscuro que cierra). */
export const FONDO_DEL_MODAL = { "data-fondo-del-modal": "" } as const;

/**
 * Mientras `activo`, el panel de `elemento` se comporta como un modal: todo lo demás de la página queda `inert` (no se
 * puede enfocar con Tab ni tocar, y el lector de pantalla no lo lee), así el foco no se escapa hacia lo que quedó tapado
 * (WCAG 2.4.3). El fondo oscuro marcado con FONDO_DEL_MODAL sigue andando (tocarlo cierra). Al cerrar, todo vuelve.
 *
 * Funciona sin sacar el panel de su lugar en el árbol: sube desde el panel hasta <body> y vuelve inertes a los hermanos de
 * cada nivel.
 */
export function useModal(elemento: RefObject<HTMLElement | null>, activo: boolean) {
  useEffect(() => {
    const panel = elemento.current;
    if (!activo || !panel) return;
    const inertes: Element[] = [];
    for (let actual: Element = panel; actual.parentElement && actual !== document.body; actual = actual.parentElement) {
      for (const hermano of Array.from(actual.parentElement.children)) {
        const quedaActivo =
          hermano === actual ||
          hermano.hasAttribute("inert") ||
          hermano.hasAttribute("data-fondo-del-modal") ||
          hermano.tagName === "SCRIPT" ||
          hermano.tagName === "STYLE";
        if (quedaActivo) continue;
        hermano.setAttribute("inert", "");
        inertes.push(hermano);
      }
    }
    return () => inertes.forEach((hermano) => hermano.removeAttribute("inert"));
  }, [elemento, activo]);
}

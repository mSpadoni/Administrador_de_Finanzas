"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/** Cuánto dura el deslizamiento (ms): lo justo para que se vea el movimiento sin hacer esperar. */
const DURACION_MS = 350;

/**
 * Cuando un elemento pasa de estar en el medio de la pantalla a estar abajo (el campo de texto al mandar el primer mensaje),
 * lo hace deslizarse en vez de saltar. Es la técnica «FLIP»: después del cambio el elemento ya está en su lugar nuevo; se lo
 * mueve de golpe a donde estaba y se lo anima hacia donde quedó. `centrado` es el estado de la pantalla; `contexto` identifica
 * la conversación (si cambia de conversación el campo no se desliza, solo cambia). Con «reducir movimiento» activado salta directo.
 */
export function useDeslizarAlBajar(elemento: RefObject<HTMLElement | null>, centrado: boolean, contexto: string) {
  const recuerdo = useRef({ arriba: 0, centrado, contexto });

  useLayoutEffect(() => {
    const nodo = elemento.current;
    const antes = recuerdo.current;
    // Con el campo abajo desde antes no hay nada que medir ni que animar: medir obliga al navegador a calcular el layout,
    // y este efecto corre en cada render (en cada letra y en cada pedazo de respuesta).
    if (!centrado && !antes.centrado) {
      recuerdo.current = { ...antes, contexto };
      return;
    }
    const arribaAhora = nodo?.getBoundingClientRect().top ?? antes.arriba;

    const bajo = antes.centrado && !centrado && antes.contexto === contexto;
    if (
      bajo &&
      nodo &&
      typeof nodo.animate === "function" &&
      Math.abs(antes.arriba - arribaAhora) > 1 &&
      // Si el campo quedó fuera de la pantalla (muchos mensajes de golpe) no hay nada que deslizar a la vista.
      arribaAhora < window.innerHeight &&
      Math.abs(antes.arriba - arribaAhora) < window.innerHeight &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      nodo.animate([{ transform: `translateY(${antes.arriba - arribaAhora}px)` }, { transform: "translateY(0)" }], {
        duration: DURACION_MS,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }
    // Solo se mide mientras está en el medio (ahí hace falta saber de dónde sale); abajo no cuesta nada.
    recuerdo.current = { arriba: centrado ? arribaAhora : antes.arriba, centrado, contexto };
  });
}

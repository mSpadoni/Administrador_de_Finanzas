"use client";

import { useEffect, useRef } from "react";
import { estaCercaDelFinal, siguienteScroll } from "../tipos";

/**
 * El scroll que acompaña a la respuesta mientras llega: cada vez que cambian los mensajes o el estado, la zona se desliza hacia
 * el final con UNA sola animación que va siguiendo al texto (requestAnimationFrame, un paso por cuadro). Antes,
 * cada pedacito de texto arrancaba un scroll animado nuevo que pisaba al anterior y la pantalla subía y bajaba.
 * Si el usuario subió a leer algo, no se lo mueve. Con "reducir movimiento" activado, salta directo.
 *
 * Devuelve el ref para la zona que scrollea, el handler de su onScroll y `volverAlFinal` (al mandar un mensaje).
 */
export function useSeguirAlFinal(mensajes: unknown, estado: unknown) {
  const zonaRef = useRef<HTMLDivElement>(null);
  // ¿El usuario está mirando el final? Se guarda en un ref (no en estado) porque cambia con cada scroll y no hace
  // falta volver a dibujar por eso.
  const pegadoAlFinalRef = useRef(true);
  const ultimoScrollRef = useRef(0); // Para saber si el usuario scrolleó para arriba.
  const animacionRef = useRef<number | null>(null); // La animación en curso, si hay una.

  useEffect(() => {
    const zona = zonaRef.current;
    if (!zona || !pegadoAlFinalRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      zona.scrollTop = zona.scrollHeight;
      return;
    }
    if (animacionRef.current !== null) return; // Ya hay una animación en curso: sigue sola hasta el nuevo final.

    const paso = () => {
      const objetivo = zona.scrollHeight - zona.clientHeight;
      if (!pegadoAlFinalRef.current || zona.scrollTop >= objetivo - 1) {
        animacionRef.current = null;
        return;
      }
      zona.scrollTop = siguienteScroll(zona.scrollTop, objetivo);
      ultimoScrollRef.current = zona.scrollTop;
      animacionRef.current = requestAnimationFrame(paso);
    };
    animacionRef.current = requestAnimationFrame(paso);
  }, [mensajes, estado]);

  // Al salir de la conversación, se corta la animación si quedó alguna.
  useEffect(
    () => () => {
      if (animacionRef.current !== null) cancelAnimationFrame(animacionRef.current);
    },
    []
  );

  /** El usuario scrolleó: si subió, deja de acompañar al texto; si volvió al final, lo retoma. */
  function alScrollear(zona: HTMLDivElement) {
    const subio = zona.scrollTop < ultimoScrollRef.current - 2;
    ultimoScrollRef.current = zona.scrollTop;
    if (subio) pegadoAlFinalRef.current = false;
    else if (estaCercaDelFinal(zona)) pegadoAlFinalRef.current = true;
  }

  /** Vuelve a acompañar al texto (ej. al mandar un mensaje, para ver la respuesta). */
  function volverAlFinal() {
    pegadoAlFinalRef.current = true;
  }

  return { zonaRef, alScrollear, volverAlFinal };
}

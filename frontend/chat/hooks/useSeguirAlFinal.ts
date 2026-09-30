"use client";

import { useCallback, useEffect, useRef } from "react";
import { estaCercaDelFinal, siguienteScroll } from "../tipos";

/**
 * El scroll que acompaña a la conversación: mientras la persona está mirando el final, la zona se mantiene pegada abajo
 * (con UNA animación que va siguiendo al contenido, un paso por cuadro, sin saltos) cuando llega un mensaje, mientras
 * escribe la respuesta, cuando el campo de texto crece o cuando cambia el alto del contenido por cualquier otro motivo
 * (una tarjeta que se dibuja, la línea de estado que aparece o se va…). Si la persona subió a leer algo, no se la mueve.
 * Con «reducir movimiento» activado, salta directo.
 *
 * Qué cuenta como «la persona subió»: que el scroll baje de posición SIN que el contenido se haya achicado. Si el contenido
 * se achica (se abre una conversación más corta, se va la línea de estado), el navegador baja el scroll solo: eso no es la
 * persona y no debe cortar el seguimiento. Tampoco cuentan los movimientos que hace la propia animación.
 *
 * Devuelve el ref para la zona que scrollea, el handler de su onScroll y `volverAlFinal` (al mandar un mensaje o abrir
 * otra conversación).
 */
export function useSeguirAlFinal(mensajes: unknown, estado: unknown) {
  const zonaRef = useRef<HTMLDivElement>(null);
  // ¿La persona está mirando el final? Se guarda en refs (no en estado) porque cambia con cada scroll y no hace falta
  // volver a dibujar por eso.
  const pegadoAlFinalRef = useRef(true);
  const ultimoScrollRef = useRef(0); // Dónde estaba el scroll la última vez que se miró (para saber si subió).
  const ultimaAlturaRef = useRef(0); // Cuánto medía el contenido la última vez (para saber si se achicó).
  const animacionRef = useRef<number | null>(null); // La animación en curso, si hay una.

  /** Mueve el scroll a `posicion` anotándola: así, cuando llegue el evento de scroll, se sabe que lo movió la app. */
  const mover = useCallback((zona: HTMLDivElement, posicion: number) => {
    zona.scrollTop = posicion;
    ultimoScrollRef.current = zona.scrollTop;
    ultimaAlturaRef.current = zona.scrollHeight;
  }, []);

  /** Lleva la zona al final (animado), si la persona está mirando el final. */
  const seguirAlFinal = useCallback(() => {
    const zona = zonaRef.current;
    if (!zona || !pegadoAlFinalRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      mover(zona, zona.scrollHeight);
      return;
    }
    if (animacionRef.current !== null) return; // Ya hay una animación en curso: sigue sola hasta el nuevo final.

    const paso = () => {
      const objetivo = zona.scrollHeight - zona.clientHeight;
      if (!pegadoAlFinalRef.current || zona.scrollTop >= objetivo - 1) {
        animacionRef.current = null;
        return;
      }
      mover(zona, siguienteScroll(zona.scrollTop, objetivo));
      animacionRef.current = requestAnimationFrame(paso);
    };
    animacionRef.current = requestAnimationFrame(paso);
  }, [mover]);

  // Llegó un mensaje, o cambió el estado de la respuesta.
  useEffect(() => {
    seguirAlFinal();
  }, [mensajes, estado, seguirAlFinal]);

  // Cambió el alto del contenido (el campo crece, una tarjeta se dibuja…) o el de la zona (el teclado del celular).
  useEffect(() => {
    const zona = zonaRef.current;
    if (!zona || typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(seguirAlFinal);
    observador.observe(zona);
    if (zona.firstElementChild) observador.observe(zona.firstElementChild);
    return () => observador.disconnect();
  }, [seguirAlFinal]);

  // Al salir de la conversación, se corta la animación si quedó alguna.
  useEffect(
    () => () => {
      if (animacionRef.current !== null) cancelAnimationFrame(animacionRef.current);
    },
    []
  );

  /** La zona scrolleó: si la persona subió, deja de acompañar al contenido; si volvió al final, lo retoma. */
  function alScrollear(zona: HTMLDivElement) {
    const seAchico = zona.scrollHeight < ultimaAlturaRef.current;
    const subio = zona.scrollTop < ultimoScrollRef.current - 2;
    ultimoScrollRef.current = zona.scrollTop;
    ultimaAlturaRef.current = zona.scrollHeight;
    if (seAchico) return; // El navegador ajustó el scroll al achicarse el contenido: no fue la persona.
    if (subio) pegadoAlFinalRef.current = false;
    else if (estaCercaDelFinal(zona)) pegadoAlFinalRef.current = true;
  }

  /** Vuelve a acompañar al contenido (ej. al mandar un mensaje, para ver la respuesta). */
  function volverAlFinal() {
    pegadoAlFinalRef.current = true;
  }

  return { zonaRef, alScrollear, volverAlFinal };
}

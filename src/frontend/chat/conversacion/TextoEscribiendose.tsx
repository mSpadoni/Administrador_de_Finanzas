"use client";

import { useEffect, useState } from "react";

type Props = {
  texto: string;
  className?: string;
  /** Cuánto tarda cada letra en aparecer (ms). */
  msPorLetra?: number;
};

/**
 * Un texto que se va escribiendo solo, letra por letra, como si alguien lo estuviera tipeando en el momento (el saludo de
 * una conversación nueva). El lector de pantalla recibe el texto completo desde el principio (la animación es solo visual),
 * y con «reducir movimiento» activado aparece entero de una.
 */
export default function TextoEscribiendose({ texto, className, msPorLetra = 45 }: Props) {
  const [escritas, setEscritas] = useState(0);
  const terminado = escritas >= texto.length;

  useEffect(() => {
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const intervalo = setInterval(
      () => setEscritas((antes) => Math.min(texto.length, antes + (reducirMovimiento ? texto.length : 1))),
      msPorLetra
    );
    return () => clearInterval(intervalo);
  }, [texto, msPorLetra]);

  return (
    <p className={className}>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">
        {texto.slice(0, escritas)}
        {/* El cursor titila mientras escribe y desaparece al terminar. */}
        {!terminado && (
          <span className="ml-0.5 inline-block w-0.5 bg-current align-middle motion-safe:animate-pulse">&nbsp;</span>
        )}
      </span>
    </p>
  );
}

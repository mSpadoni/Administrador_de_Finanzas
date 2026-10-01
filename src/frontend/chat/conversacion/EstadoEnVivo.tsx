"use client";

import { useEffect, useState } from "react";

/**
 * Lo que está haciendo el asistente ahora mismo, en una sola línea que va cambiando («Pensando…», «Consultando la cotización
 * del dólar en dolarapi.com…») con los segundos que lleva respondiendo, para que se note que sigue trabajando. Se monta
 * cuando empieza la respuesta y se va cuando termina, así el contador arranca de cero en cada respuesta. Los segundos van
 * aparte y ocultos al lector de pantalla: si no, la región de estado los anunciaría cada segundo. El detalle completo (datos
 * de cada tool, tiempos, tokens) está en el panel de debug.
 */
export default function EstadoEnVivo({ texto }: { texto: string | null }) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => setSegundos((antes) => antes + 1), 1000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div role="status" className="text-sm text-slate-700">
      {texto && (
        <p className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-blue-700 motion-safe:animate-pulse" />
          <span>{texto}</span>
          <span aria-hidden="true" className="text-slate-600 tabular-nums">
            · {segundos} s
          </span>
        </p>
      )}
    </div>
  );
}

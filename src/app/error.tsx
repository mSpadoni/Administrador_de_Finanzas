// "use client": Next exige que la página de error sea un Client Component (para poder reintentar).
"use client";

import PantallaDeAviso from "@/frontend/compartidos/PantallaDeAviso";

/**
 * Lo que ve el usuario si una página falla al cargarse (ej. la base no responde al abrir una conversación).
 * El detalle técnico queda en el log del servidor: acá nunca se muestra `error.message`.
 * `reset` vuelve a intentar dibujar la página.
 */
export default function PaginaDeError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PantallaDeAviso
      titulo="No pudimos cargar esta página"
      accion={
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
        >
          Reintentar
        </button>
      }
    >
      <p role="alert">
        Algo falló de nuestro lado. Probá de nuevo en unos segundos; tus conversaciones siguen guardadas.
      </p>
    </PantallaDeAviso>
  );
}



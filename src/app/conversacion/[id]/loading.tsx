/**
 * Lo que se ve mientras el servidor arma la pantalla de una conversación (al entrar o al recargar): el esqueleto de la
 * pantalla, con el mismo lugar para cada parte, así nada salta cuando llega. Para el lector de pantalla, un aviso.
 */
export default function CargandoConversacion() {
  return (
    <div className="flex h-dvh flex-col bg-fondo" aria-busy="true">
      <p role="status" className="sr-only">
        Cargando tu conversación…
      </p>
      <div aria-hidden="true" className="h-14 border-b border-borde bg-superficie md:hidden" />
      <div aria-hidden="true" className="flex min-h-0 flex-1">
        <div className="hidden w-72 shrink-0 space-y-3 border-r border-borde bg-superficie-suave p-4 md:block">
          <div className="h-11 rounded-xl bg-esqueleto motion-safe:animate-pulse" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-8 rounded-lg bg-esqueleto motion-safe:animate-pulse" />
          ))}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
          <div className="h-8 w-64 rounded-lg bg-esqueleto motion-safe:animate-pulse" />
          <div className="h-14 w-full max-w-3xl rounded-3xl bg-esqueleto motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}

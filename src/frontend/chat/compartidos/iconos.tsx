// Los íconos de la interfaz: trazos simples de 24×24 (estilo línea) en un solo lugar. Son decorativos (aria-hidden):
// el botón o el ítem que los lleva siempre tiene su texto o su aria-label, así nunca hay un ícono solo.

const TRAZOS = {
  mas: "M12 5v14M5 12h14",
  enviar: "M12 19V5M5 12l7-7 7 7",
  detener: "M7 7h10v10H7z",
  conversacionNueva: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  resumen: "M3 3v18h18M7 14l4-4 3 3 5-6",
  categorias: "M21.2 15.9A10 10 0 1 1 8 2.8M22 12A10 10 0 0 0 12 2v10Z",
  dolar: "M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  cerrarSesion: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  borrar: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  menu: "M4 6h16M4 12h16M4 18h16",
  cerrar: "M6 6l12 12M18 6L6 18",
  debug:
    "M8 2l1.9 1.9M16 2l-1.9 1.9M9 7.1V6a3 3 0 0 1 6 0v1.1M12 20v-9M6.5 13H3M21 13h-3.5M6 17l-2.5 2M18 17l2.5 2M8 8h8a4 4 0 0 1 4 4v1a8 8 0 0 1-16 0v-1a4 4 0 0 1 4-4Z",
  arribaAbajo: "m7 15 5 5 5-5M7 9l5-5 5 5",
} as const;

export type NombreDeIcono = keyof typeof TRAZOS;

/** Un ícono decorativo. El tamaño y el color los pone quien lo usa (`className`, el color es el del texto). */
export default function Icono({ nombre, className = "size-5" }: { nombre: NombreDeIcono; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={nombre === "detener" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

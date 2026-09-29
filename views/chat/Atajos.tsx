import { ATAJOS } from "./respuesta";

type Props = {
  /** Qué hacer con el mensaje del atajo (mandarlo o ponerlo en el campo para completarlo). */
  onUsar: (mensaje: string) => void;
  deshabilitados: boolean;
};

/** Atajos chicos debajo del campo, siempre a mano. */
export default function Atajos({ onUsar, deshabilitados }: Props) {
  return (
    <ul aria-label="Atajos" className="flex flex-wrap gap-2 bg-white px-4 pb-3">
      {ATAJOS.map((atajo) => (
        <li key={atajo.titulo}>
          <button
            type="button"
            onClick={() => onUsar(atajo.mensaje)}
            disabled={deshabilitados}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-blue-700 hover:bg-blue-50 disabled:opacity-60"
          >
            {atajo.titulo}
          </button>
        </li>
      ))}
    </ul>
  );
}

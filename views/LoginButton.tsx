// "use client": este componente corre en el navegador (necesita saber si el formulario se está enviando).
"use client";

import { useFormStatus } from "react-dom";

// Textos del botón según la variante y el estado. `as const` fija los valores exactos (no "cualquier string")
// y los vuelve de solo lectura.
const TEXTOS = {
  ingresar: { normal: "Ingresar con Google", pendiente: "Redirigiendo a Google…" },
  salir: { normal: "Cerrar sesión", pendiente: "Cerrando sesión…" },
} as const;

const ESTILOS = {
  ingresar: "bg-blue-600 text-white hover:bg-blue-700",
  salir: "border border-slate-300 text-slate-700 hover:bg-slate-50",
} as const;

// `typeof TEXTOS` = el tipo del objeto TEXTOS; `keyof` = sus claves. Resultado: "ingresar" | "salir".
type Variante = keyof typeof TEXTOS;

type Props = {
  /** Server action que ejecuta el botón (se la pasa la página). */
  accion: () => Promise<void>;
  variante: Variante;
};

/**
 * Botón de "Ingresar con Google" o "Cerrar sesión". Es un <form> cuya `action` es una Server Action:
 * al tocarlo, Next.js ejecuta `accion` en el servidor.
 */
export default function LoginButton({ accion, variante }: Props) {
  return (
    <form action={accion}>
      <BotonEnviar variante={variante} />
    </form>
  );
}

// useFormStatus tiene que usarse en un componente hijo del <form>.
// `{ variante }: { variante: Variante }`: desestructura la prop y declara su tipo en el mismo lugar.
function BotonEnviar({ variante }: { variante: Variante }) {
  // `pending` es true mientras la Server Action se está ejecutando: sirve para deshabilitar el botón y cambiar el texto.
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-wait disabled:opacity-80 ${ESTILOS[variante]}`}
    >
      {pending ? TEXTOS[variante].pendiente : TEXTOS[variante].normal}
    </button>
  );
}

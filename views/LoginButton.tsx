// "use client": este componente corre en el navegador (necesita saber si el formulario se está enviando).
"use client";

import { useFormStatus } from "react-dom";

type Props = {
  /** Server action que ejecuta el botón (se la pasa la página). */
  accion: () => Promise<void>;
};

/**
 * Botón de "Ingresar con Google". Es un <form> cuya `action` es una Server Action:
 * al tocarlo, Next.js ejecuta `accion` en el servidor. (Cerrar sesión está en el perfil de la barra lateral.)
 */
export default function LoginButton({ accion }: Props) {
  return (
    <form action={accion}>
      <BotonEnviar />
    </form>
  );
}

// useFormStatus tiene que usarse en un componente hijo del <form>.
function BotonEnviar() {
  // `pending` es true mientras la Server Action se está ejecutando: sirve para deshabilitar el botón y cambiar el texto.
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="h-11 rounded-full bg-blue-700 px-6 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? "Redirigiendo a Google…" : "Ingresar con Google"}
    </button>
  );
}

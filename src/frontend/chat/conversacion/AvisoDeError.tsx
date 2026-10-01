import Link from "next/link";
import { SE_PUEDE_REINTENTAR } from "@/shared/erroresShared";
import { RUTAS } from "@/shared/rutas";
import { errorParaMostrar } from "./tipos";

type Props = { error: Error; onReintentar: () => void };

/**
 * Qué pasó (en palabras del usuario, no técnicas) y cómo seguir (heurística #9). Qué se ofrece depende del CÓDIGO
 * del error, no del texto: "Reintentar" solo cuando reintentar puede funcionar; con la sesión vencida, volver a
 * ingresar.
 */
export default function AvisoDeError({ error, onReintentar }: Props) {
  const { codigo, mensaje } = errorParaMostrar(error);
  return (
    <div role="alert" className="rounded-lg border border-peligro-borde bg-peligro-suave p-4 text-sm text-peligro">
      <p className="font-medium">
        <span aria-hidden="true">⚠ </span>
        {mensaje}
      </p>
      {codigo === "no_autenticado" ? (
        // "/" lee la sesión en el servidor: sin sesión muestra el botón de Google.
        <Link
          href={RUTAS.inicio}
          className="mt-2 inline-block rounded-lg border border-peligro-borde bg-superficie px-3 py-1.5 font-medium text-peligro hover:bg-peligro-suave-fuerte"
        >
          Volver a ingresar
        </Link>
      ) : (
        SE_PUEDE_REINTENTAR[codigo] && (
          <button
            type="button"
            // Reintentar vuelve a pedir la respuesta al último mensaje (el servidor no lo guarda dos veces).
            onClick={onReintentar}
            className="mt-2 rounded-lg border border-peligro-borde bg-superficie px-3 py-1.5 font-medium text-peligro hover:bg-peligro-suave-fuerte"
          >
            Reintentar
          </button>
        )
      )}
    </div>
  );
}

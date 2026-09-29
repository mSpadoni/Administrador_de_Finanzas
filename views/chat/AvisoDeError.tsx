import Link from "next/link";
import { SE_PUEDE_REINTENTAR } from "@/shared/errores";
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
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-medium">
        <span aria-hidden="true">⚠ </span>
        {mensaje}
      </p>
      {codigo === "no_autenticado" ? (
        // "/" lee la sesión en el servidor: sin sesión muestra el botón de Google.
        <Link
          href="/"
          className="mt-2 inline-block rounded-lg border border-red-400 bg-white px-3 py-1.5 font-medium text-red-900 hover:bg-red-100"
        >
          Volver a ingresar
        </Link>
      ) : (
        SE_PUEDE_REINTENTAR[codigo] && (
          <button
            type="button"
            // Reintentar vuelve a pedir la respuesta al último mensaje (el servidor no lo guarda dos veces).
            onClick={onReintentar}
            className="mt-2 rounded-lg border border-red-400 bg-white px-3 py-1.5 font-medium text-red-900 hover:bg-red-100"
          >
            Reintentar
          </button>
        )
      )}
    </div>
  );
}

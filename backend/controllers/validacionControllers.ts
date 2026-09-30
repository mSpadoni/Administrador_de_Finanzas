import "server-only";
import { z } from "zod";
import { MAX_CARACTERES_MENSAJE, type AsistenteUIMessage } from "@/shared/chat";
import { lanzarPedidoInvalido } from "./erroresControllers";

// Todo lo que manda el navegador se valida acá, con Zod, antes de que el controller haga nada: ningún dato del
// navegador llega a un model sin pasar por uno de estos esquemas. (zod `z` describe cómo tiene que ser un dato y
// lo valida; el texto de cada regla es el error que ve el usuario.)
// Otras validaciones viven con su dueño: las entradas de las tools (las manda el LLM) en tools/validacionTools.ts, y los
// movimientos en el dominio (models/dominio/movimiento.ts).

/** El primer problema de una validación, con el texto que ve la persona (o `porDefecto` si no trae ninguno). */
export function primerMensaje(error: { issues: readonly { message: string }[] }, porDefecto: string): string {
  return error.issues[0]?.message ?? porDefecto;
}

/** Cualquier dato del navegador que no pasa su esquema: se corta con un error de pedido inválido (la ruta, 400). */
function validar<Esquema extends z.ZodType>(esquema: Esquema, datos: unknown): z.output<Esquema> {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    return lanzarPedidoInvalido(primerMensaje(resultado.error, "El pedido no es válido."));
  }
  return resultado.data;
}

// ---------------------------------------------------------------------------------------------------------------
// Id de conversación (en la URL, y al borrar)

const IdDeConversacionSchema = z.uuid("La conversación no es válida.");

/** ¿Es un id de conversación válido? (Las conversaciones se identifican con un UUID que genera el servidor.) */
export function esIdDeConversacion(id: unknown): id is string {
  return IdDeConversacionSchema.safeParse(id).success;
}

// ---------------------------------------------------------------------------------------------------------------
// El mensaje nuevo del chat (POST /api/chat)

// El navegador manda solo el mensaje nuevo (en el formato del Vercel AI SDK) y el id de la conversación:
// el historial lo lee el servidor de la base, así nadie puede inventarle al asistente una conversación.
const PedidoDeChatSchema = z.object({
  id: IdDeConversacionSchema,
  mensaje: z.object(
    {
      id: z.string().min(1).max(100),
      role: z.literal("user", "El mensaje tiene que ser del usuario."),
      parts: z
        .array(
          z.object({
            type: z.literal("text", "Por ahora solo se pueden mandar mensajes de texto."),
            text: z
              .string()
              .trim()
              .min(1, "El mensaje está vacío.")
              .max(MAX_CARACTERES_MENSAJE, `Un mensaje no puede superar los ${MAX_CARACTERES_MENSAJE} caracteres.`),
          })
        )
        .length(1, "El mensaje tiene que tener un solo texto."),
    },
    "Falta el mensaje."
  ),
});

/** Un mensaje del usuario ya validado: a qué conversación va, el mensaje en formato del AI SDK y su texto. */
export type PedidoDeChat = { conversacionId: string; mensaje: AsistenteUIMessage; texto: string };

/** Valida el cuerpo de POST /api/chat. Si no es válido, tira ErrorDeAplicacion("pedido_invalido"). */
export function validarPedidoDeChat(cuerpo: unknown): PedidoDeChat {
  const { id, mensaje } = validar(PedidoDeChatSchema, cuerpo);
  return { conversacionId: id, mensaje, texto: mensaje.parts[0].text };
}

// ---------------------------------------------------------------------------------------------------------------
// El código que manda Google al volver del login (/auth/callback?code=...)

const CodigoDeLoginSchema = z.string().trim().min(1).max(512);

/** El código de login, o null si falta o no tiene forma de código (Supabase igual lo verifica al canjearlo). */
export function codigoDeLogin(codigo: unknown): string | null {
  const resultado = CodigoDeLoginSchema.safeParse(codigo);
  return resultado.success ? resultado.data : null;
}

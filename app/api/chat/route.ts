import { createUIMessageStreamResponse } from "ai";
import { authController } from "@/backend/controllers/auth.controller";
import { chatController } from "@/backend/controllers/chat.controller";
import { respuestaDeError, respuestaDeErrorPublico } from "../respuestaDeError";

// En Vercel, cuánto puede durar la función como máximo (segundos): el stream del asistente con sus tools.
export const maxDuration = 60;

/**
 * Endpoint POST /api/chat: lo llama useChat en el navegador con el mensaje nuevo y el id de la conversación.
 * Si sale bien, devuelve la respuesta del asistente en streaming. Si algo falla antes de empezar, responde JSON
 * `{ error: { codigo, mensaje } }` con su status HTTP (ver respuestaDeError.ts).
 */
export async function POST(request: Request) {
  // 1) Solo usuarios logueados pueden usar el asistente.
  const usuario = await authController.obtenerUsuarioActual();
  if (!usuario) {
    return respuestaDeErrorPublico({
      codigo: "no_autenticado",
      mensaje: "Tu sesión expiró. Volvé a ingresar con Google.",
    });
  }

  // 2) El cuerpo tal cual lo mandó el navegador (si no es JSON, null): lo valida el controller con Zod.
  const cuerpo: unknown = await request.json().catch(() => null);

  // 3) La respuesta del asistente en streaming. Los errores de antes de empezar (pedido inválido, límite de uso,
  //    conversación ajena...) se responden con su código.
  try {
    return createUIMessageStreamResponse({ stream: await chatController.responder(cuerpo) });
  } catch (error) {
    return respuestaDeError(error);
  }
}

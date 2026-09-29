import { randomUUID } from "node:crypto";
import { ChatController } from "@/backend/controllers/chat.controller";
import { ConversacionesModel } from "@/backend/models/repositorios/conversaciones.model";
import type { MetadatosDeRespuesta, AsistenteUIMessage } from "@/shared/chat";
import { leerErrorPublico } from "@/shared/errores";
import { crearUsuarioLogueado } from "./usuarioDePrueba";

// Lo que comparten los tests del chat (con el modelo de prueba y con el real): un usuario con su controller,
// mandar un mensaje como useChat y leer lo que quedó guardado.

/** Un usuario logueado, sus models y un ChatController que guarda con su sesión. */
export async function usuarioConChat(dependencias: ConstructorParameters<typeof ChatController>[0] = {}) {
  const usuario = await crearUsuarioLogueado();
  const conversaciones = new ConversacionesModel(usuario.navegador.crearCliente);
  const controller = new ChatController({
    conversaciones: () => conversaciones,
    ...dependencias,
  });
  return { usuario, conversaciones, controller };
}

/** Lo que miran los tests de cada evento del stream (cada tipo de evento trae solo algunos de estos campos). */
export type Evento = { type: string; errorText?: string; delta?: string; messageMetadata?: MetadatosDeRespuesta };

/** Manda un mensaje como useChat (el cuerpo tal cual lo manda el navegador), lee el stream y devuelve sus eventos. */
export async function conversar(controller: ChatController, conversacionId: string, texto: string) {
  const cuerpo = {
    id: conversacionId,
    mensaje: { id: randomUUID(), role: "user", parts: [{ type: "text", text: texto }] },
  };
  const lector = (await controller.responder(cuerpo)).getReader();
  const eventos: Evento[] = [];
  for (let leido = await lector.read(); !leido.done; leido = await lector.read()) eventos.push(leido.value);
  return eventos;
}

/** El código del error que llegó dentro del stream (el navegador lo lee igual). */
export const codigoDelError = (eventos: Evento[]) =>
  leerErrorPublico(eventos.find((evento) => evento.type === "error")?.errorText ?? "")?.codigo;

/**
 * Los mensajes guardados de la conversación. La respuesta del asistente se guarda en el onFinish del stream, y el
 * AI SDK lo espera antes de cerrarlo: cuando `conversar` terminó de leer, ya está guardada (sin esperas).
 */
export function mensajesGuardados(conversaciones: ConversacionesModel, id: string) {
  return conversaciones.mensajes(id);
}

/** Qué tools usó el asistente en un mensaje guardado (sus partes "tool-<nombre>"), sin repetir. */
export const herramientas = (mensaje: AsistenteUIMessage) => [
  ...new Set(mensaje.parts.filter((parte) => parte.type.startsWith("tool-")).map((parte) => parte.type.slice(5))),
];

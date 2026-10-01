"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AsistenteUIMessage } from "@/shared/chat";
import { useSidebar } from "../../sidebar/EstadoSidebar";
import { anuncioDeRespuesta, cambioLosMovimientos, tituloDeLaConversacion } from "../../conversacion/respuesta";

/**
 * La conversación con el asistente en el navegador: useChat (Vercel AI SDK) con el transporte de /api/chat, más lo que
 * pasa cuando termina cada respuesta (el anuncio para el lector de pantalla y el sidebar actualizado).
 * Mientras la conversación está abierta, los mensajes viven acá; cada uno nuevo lo guarda el servidor en la base.
 */
export function useChatDelAsistente(
  conversacionId: string,
  mensajesIniciales: AsistenteUIMessage[],
  retitular: (id: string) => Promise<string | null>
) {
  const { alTerminarRespuesta, cambiarTitulo } = useSidebar();
  const router = useRouter();
  const [anuncio, setAnuncio] = useState(""); // Lo que lee el lector de pantalla cuando termina una respuesta.

  // El transporte se crea una sola vez (useState con función). Manda solo el mensaje nuevo y el id de la
  // conversación: el servidor lee el historial de la base.
  const [transporte] = useState(
    () =>
      new DefaultChatTransport<AsistenteUIMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages }) => ({ body: { id, mensaje: messages.at(-1) } }),
      })
  );

  const chat = useChat<AsistenteUIMessage>({
    id: conversacionId,
    messages: mensajesIniciales,
    transport: transporte,
    // Mientras llega la respuesta, la pantalla se actualiza a lo sumo cada 50 ms (y no con cada pedacito que manda el
    // modelo): la respuesta se sigue viendo fluida y el navegador trabaja mucho menos.
    experimental_throttle: 50,
    onFinish: ({ message, messages, isAbort, isError }) => {
      if (!isAbort && !isError) setAnuncio(anuncioDeRespuesta(message));
      // El sidebar se actualiza con lo que ya sabemos, sin volver a consultar la base: la conversación sube arriba
      // (si es nueva, con el mismo título que le puso el servidor).
      if (!isError) alTerminarRespuesta({ id: conversacionId, titulo: tituloDeLaConversacion(messages) });
      // Después el servidor le pone el título de verdad según lo que se habló (y lo va cambiando si la charla cambia de
      // tema). Llega un momento más tarde: el sidebar lo muestra apenas está, sin frenar nada.
      if (!isError && !isAbort) {
        retitular(conversacionId)
          .then((titulo) => titulo && cambiarTitulo(conversacionId, titulo))
          .catch(() => undefined); // Es un extra: si falla, queda el título de antes.
      }
      // Si se registró o borró un movimiento, el panel «Este mes» se vuelve a leer (la página no recarga: el chat sigue).
      if (!isError && cambioLosMovimientos(message)) router.refresh();
    },
  });

  /** Manda un mensaje del usuario. El anuncio anterior se borra, así el próximo se vuelve a leer. */
  function enviar(texto: string) {
    setAnuncio("");
    void chat.sendMessage({ text: texto });
  }

  return {
    ...chat,
    enviar,
    anuncio,
    /** Mientras el asistente está pensando o escribiendo. */
    generando: chat.status === "submitted" || chat.status === "streaming",
  };
}

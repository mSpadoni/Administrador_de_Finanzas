// "use client": corre en el navegador, porque maneja estado (mensajes, lo que se escribe) y clicks.
"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { MAX_CARACTERES_MENSAJE, type AsistenteUIMessage } from "@/shared/chat";
import { ProveedorDelBorrador } from "./ContextoDelBorrador";
import { ProveedorDePaneles } from "./ContextoDePaneles";
import { lanzarChatSinProveedor } from "./erroresEstado";
import { useChatDelAsistente } from "./hooks/useChatDelAsistente";
import { useSeguirAlFinal } from "./hooks/useSeguirAlFinal";
import { idDeConversacionEnLaUrl, nuevoIdDeConversacion, urlDeConversacion } from "../compartidos/navegacion";
import { estadoDeLaRespuesta, type Atajo } from "../conversacion/respuesta";

type ValorDelChat = Omit<ReturnType<typeof useChatDelAsistente>, "enviar"> & {
  /** La conversación que se está viendo. */
  conversacionId: string;
  /** Mientras se lee de la base una conversación que la persona acaba de elegir. */
  abriendo: boolean;
  /**
   * Empieza una conversación nueva, desde cero, sin recargar nada (como en ChatGPT). Si la actual todavía está vacía, no
   * hace falta otra: solo se enfoca el campo. `forzar`: cambia igual (ej. se acaba de borrar la conversación abierta).
   */
  nuevaConversacion: (forzar?: boolean) => void;
  /** Abre una conversación guardada, sin recargar la página. */
  abrirConversacion: (id: string) => Promise<void>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** El scroll de la zona de mensajes (ver useSeguirAlFinal). */
  zonaRef: RefObject<HTMLDivElement | null>;
  alScrollear: (zona: HTMLDivElement) => void;
  /**
   * Manda un mensaje del usuario (el del campo o el de un atajo). Devuelve si se mandó: uno vacío, pasado del límite o
   * mientras el asistente responde no se manda (y el campo no se vacía).
   */
  mandar: (texto: string) => boolean;
  /** Un atajo: se manda directo al asistente. */
  usarAtajo: (atajo: Atajo) => void;
  /** Qué está haciendo el asistente ahora («Pensando…», «Consultando tus movimientos…»), o null. */
  estadoDelAsistente: string | null;
};

const ContextoDelChat = createContext<ValorDelChat | null>(null);

/** La conversación que se ve: su id y su historial. */
type Sesion = { id: string; mensajes: AsistenteUIMessage[] };

type Props = {
  /** La conversación con la que se abrió la pantalla (la de la dirección). Solo cuenta al principio: después se cambia acá. */
  conversacionId: string;
  /** Su historial, leído de la base una sola vez. */
  mensajesIniciales: AsistenteUIMessage[];
  /** Server action que lee el historial de una conversación (para abrirla sin recargar la página). */
  leerConversacion: (id: string) => Promise<AsistenteUIMessage[]>;
  /** Le pide al servidor un título para la conversación según lo que se habló (null si no se pudo). */
  retitular: (id: string) => Promise<string | null>;
  children: ReactNode;
};

/**
 * El chat de la pantalla, compartido entre quienes lo usan: la ventana de mensajes, el campo de texto y los atajos de la
 * barra lateral (que mandan un mensaje sin ser parte del chat). Los mensajes los maneja useChatDelAsistente y el scroll,
 * useSeguirAlFinal. Lo que cambia mucho y no es del chat va en contextos aparte, para no volver a dibujar la conversación
 * por cada cosa: el borrador del campo (ContextoDelBorrador, cambia con cada letra) y los paneles abiertos
 * (ContextoDePaneles).
 *
 * También es quien cambia de conversación (nueva, abrir una guardada, ir atrás o adelante): lo hace en el navegador y
 * actualiza la dirección con `history.pushState`, sin pedirle al servidor la página entera. Así no hay un momento en blanco
 * y la transición se puede animar. `useChat` empieza un chat nuevo cada vez que cambia el `id`.
 */
export function ProveedorDelChat({ conversacionId, mensajesIniciales, leerConversacion, retitular, children }: Props) {
  const [sesion, setSesion] = useState<Sesion>({ id: conversacionId, mensajes: mensajesIniciales });
  const [abriendo, setAbriendo] = useState(false);
  const { enviar, ...chat } = useChatDelAsistente(sesion.id, sesion.mensajes, retitular);
  const { zonaRef, alScrollear, volverAlFinal } = useSeguirAlFinal(chat.messages, chat.status);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idActualRef = useRef(sesion.id); // Para el evento de «atrás», que no ve el estado de este render.
  // Cada cambio de conversación tiene un número: si mientras se abre una la persona elige otra cosa, la lectura que llega
  // tarde ya no es la última y se descarta (si no, pisaría lo que eligió después).
  const ultimoCambioRef = useRef(0);

  useEffect(() => {
    idActualRef.current = sesion.id;
  }, [sesion.id]);

  /**
   * Muestra otra conversación: vuelve al final y (salvo si viene de «atrás») actualiza la dirección. El campo se vacía solo:
   * el borrador es de cada conversación (ProveedorDelBorrador).
   */
  function cambiarA(nueva: Sesion, actualizarUrl: boolean) {
    ultimoCambioRef.current += 1;
    setAbriendo(false);
    setSesion(nueva);
    volverAlFinal();
    if (actualizarUrl) window.history.pushState(null, "", urlDeConversacion(nueva.id));
    textareaRef.current?.focus();
  }

  function nuevaConversacion(forzar = false) {
    if (!forzar && chat.messages.length === 0) {
      textareaRef.current?.focus();
      return;
    }
    cambiarA({ id: nuevoIdDeConversacion(), mensajes: [] }, true);
  }

  async function abrirConversacion(id: string, actualizarUrl = true) {
    if (id === sesion.id) return;
    const cambio = (ultimoCambioRef.current += 1);
    const sigueSiendoLaUltima = () => cambio === ultimoCambioRef.current;
    setAbriendo(true);
    try {
      const mensajes = await leerConversacion(id);
      if (sigueSiendoLaUltima()) cambiarA({ id, mensajes }, actualizarUrl);
    } catch {
      // Si no se pudo leer sin recargar, se abre de la forma de siempre (la página la pide al servidor).
      if (sigueSiendoLaUltima()) window.location.assign(urlDeConversacion(id));
    } finally {
      if (sigueSiendoLaUltima()) setAbriendo(false);
    }
  }

  // «Atrás» y «adelante» del navegador: la dirección cambió sola, hay que mostrar la conversación que le corresponde.
  useEffect(() => {
    const alVolver = () => {
      const id = idDeConversacionEnLaUrl(window.location.pathname);
      if (id && id !== idActualRef.current) void abrirConversacion(id, false);
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
    // Se vuelve a enganchar con cada conversación: `abrirConversacion` usa la conversación de ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion.id]);

  function mandar(texto: string) {
    const limpio = texto.trim();
    // Un mensaje vacío o pasado del límite no se manda (el campo ya lo avisa; el servidor también lo rechazaría).
    if (!limpio || limpio.length > MAX_CARACTERES_MENSAJE || chat.generando) return false;
    volverAlFinal(); // Al mandar un mensaje, se vuelve al final para ver la respuesta.
    enviar(limpio);
    textareaRef.current?.focus();
    return true;
  }

  const valor: ValorDelChat = {
    ...chat,
    conversacionId: sesion.id,
    abriendo,
    nuevaConversacion,
    abrirConversacion,
    textareaRef,
    zonaRef,
    alScrollear,
    mandar,
    usarAtajo: (atajo) => void mandar(atajo.mensaje),
    estadoDelAsistente: estadoDeLaRespuesta(chat.status, chat.messages),
  };
  return (
    <ContextoDelChat.Provider value={valor}>
      <ProveedorDePaneles>
        <ProveedorDelBorrador conversacionId={sesion.id}>{children}</ProveedorDelBorrador>
      </ProveedorDePaneles>
    </ContextoDelChat.Provider>
  );
}

/**
 * El chat de la pantalla si hay uno, o null: para las piezas que también se muestran fuera del chat (como el resumen del
 * mes) y que, sin chat, simplemente no muestran lo que depende de él.
 */
export function useChatEnPantallaSiHay(): ValorDelChat | null {
  return useContext(ContextoDelChat);
}

/** El chat de la pantalla. Solo se puede usar adentro de <ProveedorDelChat>. */
export function useChatEnPantalla(): ValorDelChat {
  return useContext(ContextoDelChat) ?? lanzarChatSinProveedor();
}

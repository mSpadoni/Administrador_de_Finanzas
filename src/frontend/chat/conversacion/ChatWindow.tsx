// "use client": corre en el navegador, porque maneja clicks y lo que se escribe.
"use client";

import { useRef } from "react";
import AvisoDeError from "./AvisoDeError";
import EstadoEnVivo from "./EstadoEnVivo";
import { useBorrador } from "../estado/ContextoDelBorrador";
import { useChatEnPantalla } from "../estado/ContextoDelChat";
import { useDeslizarAlBajar } from "./hooks/useDeslizarAlBajar";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { mensajeListoParaMostrar } from "./respuesta";
import TextoEscribiendose from "./TextoEscribiendose";

/**
 * La ventana de chat: mensajes con la respuesta en streaming, qué está haciendo el asistente, errores y el campo para
 * escribir. El chat en sí (mensajes, scroll) vive en ProveedorDelChat, porque también lo usan los atajos de la barra
 * lateral; el borrador del campo, en ProveedorDelBorrador (ver CampoDelChat).
 *
 * En una conversación vacía el saludo y el campo de texto van juntos en el medio de la pantalla (como ChatGPT); con el primer
 * mensaje el campo baja hasta abajo del todo, deslizándose, y los mensajes ocupan el resto. Es el mismo campo en los dos
 * lugares (no se vuelve a crear): no pierde el foco ni lo que se escribió.
 */
export default function ChatWindow({ nombre }: { nombre: string }) {
  const {
    conversacionId,
    abriendo,
    messages,
    error,
    regenerate,
    stop,
    generando,
    anuncio,
    estadoDelAsistente,
    textareaRef,
    zonaRef,
    alScrollear,
    mandar,
    usarAtajo,
  } = useChatEnPantalla();
  const campoRef = useRef<HTMLDivElement>(null);
  const centrado = messages.length === 0;
  useDeslizarAlBajar(campoRef, centrado, conversacionId);

  return (
    <main id="chat" className="flex min-h-0 flex-1 flex-col">
      <section
        aria-labelledby="titulo-conversacion"
        data-campo={centrado ? "al-medio" : "abajo"}
        className="relative flex min-h-0 flex-1 flex-col"
      >
        <h2 id="titulo-conversacion" className="sr-only">
          Conversación con el asistente
        </h2>
        {/* Mientras se lee otra conversación: un aviso a la vista y para el lector de pantalla (no solo la opacidad). */}
        <p role="status" className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center empty:hidden">
          {abriendo && (
            <span className="rounded-full bg-superficie px-3 py-1 text-sm text-tinta shadow-md">
              Abriendo la conversación…
            </span>
          )}
        </p>

        {/* El scroll es de todo el bloque, campo incluido: el campo queda pegado abajo (sticky) y los mensajes pasan por
            debajo al scrollear, con su fondo translúcido. Con la conversación vacía el campo no se pega: va junto al
            saludo, en el medio. */}
        <div
          ref={zonaRef}
          onScroll={(evento) => alScrollear(evento.currentTarget)}
          aria-busy={abriendo}
          // Mientras se lee otra conversación, la actual se atenúa (no queda la pantalla en blanco ni congelada).
          className={`flex-1 scroll-pb-36 overflow-y-auto transition-opacity duration-200 motion-reduce:transition-none ${
            abriendo ? "opacity-50" : "opacity-100"
          }`}
        >
          <div className={`flex min-h-full flex-col ${centrado ? "justify-center" : ""}`}>
            <div className={`px-4 ${centrado ? "flex-none pt-6 pb-2" : "flex-1 py-6"}`}>
              {/* key: al cambiar de conversación este bloque se vuelve a crear y entra con su animación (y el saludo se
                  escribe de nuevo), en vez de cambiar de golpe. */}
              <div key={conversacionId} className="mx-auto flex max-w-3xl flex-col gap-4 motion-safe:animate-aparecer">
                {centrado && (
                  <div className="text-center">
                    {/* El saludo se escribe solo, como si se estuviera tipeando en el momento; la explicación aparece después. */}
                    <TextoEscribiendose
                      texto={`Hola, ${nombre}. ¿Qué querés hacer?`}
                      className="text-2xl font-semibold text-tinta sm:text-3xl"
                    />
                    <p className="mx-auto mt-2 max-w-md text-sm text-tinta-suave [animation-delay:1.8s] motion-safe:animate-aparecer">
                      Contame un gasto o un ingreso como se lo contarías a alguien («gasté 5.000 en el súper con
                      débito»), preguntá cómo venís este mes o a cuánto está el dólar. También tenés atajos en el «+»
                      del campo y en la barra lateral.
                    </p>
                  </div>
                )}

                {/* aria-live="off": mientras la respuesta llega palabra por palabra no se anuncia (sería ruido).
                    La respuesta completa la anuncia la región de abajo cuando termina.
                    tabIndex: con mensajes, la lista es una parada de Tab (entre los atajos y el campo), así quien usa
                    solo el teclado puede scrollear la conversación con las flechas, Re Pág/Av Pág, Inicio y Fin
                    (WCAG 2.1.1). Vacía no hace falta: no hay nada que scrollear. */}
                <ol
                  aria-label="Mensajes de la conversación"
                  aria-live="off"
                  tabIndex={messages.length > 0 ? 0 : undefined}
                  className="flex flex-col gap-4 rounded-xl"
                >
                  {messages.map((mensaje) => {
                    // La respuesta que se está generando con herramientas se muestra recién cuando terminaron todas
                    // (mientras tanto, la línea de estado dice qué está haciendo); las demás, siempre.
                    const seEstaGenerando = generando && mensaje.id === messages.at(-1)?.id;
                    return mensajeListoParaMostrar(mensaje, seEstaGenerando) ? (
                      <MessageBubble key={mensaje.id} mensaje={mensaje} />
                    ) : null;
                  })}
                </ol>

                {/* Qué está haciendo el asistente ahora (y con qué API), con los segundos que lleva: estado visible con
                    texto, no solo una animación (heurística #1). Solo mientras responde. */}
                {generando && <EstadoEnVivo texto={estadoDelAsistente} />}
                <p aria-live="polite" className="sr-only">
                  {anuncio}
                </p>

                {error && <AvisoDeError error={error} onReintentar={() => void regenerate()} />}
              </div>
            </div>

            {/* El degradé de fondo deja leer el texto de ayuda sin tapar los mensajes que pasan por debajo. */}
            <div
              ref={campoRef}
              className={
                centrado ? "" : "sticky bottom-0 z-10 bg-gradient-to-t from-fondo/80 via-fondo/40 to-transparent"
              }
            >
              <div className="mx-auto w-full max-w-3xl">
                <CampoDelChat
                  mandar={mandar}
                  onDetener={stop}
                  onUsarAtajo={usarAtajo}
                  generando={generando}
                  textareaRef={textareaRef}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

type PropsDelCampo = Omit<Parameters<typeof MessageInput>[0], "valor" | "onCambio" | "onEnviar"> & {
  mandar: (texto: string) => boolean;
};

/**
 * El campo de texto con su borrador. Es el único que escucha el borrador: escribir una letra vuelve a dibujar el campo y
 * no la lista de mensajes. Al mandar, el campo se vacía solo si el mensaje salió.
 */
function CampoDelChat({ mandar, ...props }: PropsDelCampo) {
  const { borrador, setBorrador } = useBorrador();
  return (
    <MessageInput
      {...props}
      valor={borrador}
      onCambio={setBorrador}
      onEnviar={() => {
        if (mandar(borrador)) setBorrador("");
      }}
    />
  );
}

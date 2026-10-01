// "use client": corre en el navegador, porque maneja clicks y lo que se escribe.
"use client";

import { useRef } from "react";
import AvisoDeError from "./AvisoDeError";
import EstadoEnVivo from "./EstadoEnVivo";
import { useChatEnPantalla } from "./ContextoDelChat";
import { useDeslizarAlBajar } from "./hooks/useDeslizarAlBajar";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { mensajeListoParaMostrar } from "./respuesta";
import TextoEscribiendose from "./TextoEscribiendose";

/**
 * La ventana de chat: mensajes con la respuesta en streaming, qué está haciendo el asistente, errores y el campo para
 * escribir. El chat en sí (mensajes, borrador, scroll) vive en ProveedorDelChat, porque también lo usan los atajos de la
 * barra lateral.
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
    borrador,
    setBorrador,
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
      <section aria-labelledby="titulo-conversacion" data-campo={centrado ? "al-medio" : "abajo"} className="flex min-h-0 flex-1 flex-col">
        <h2 id="titulo-conversacion" className="sr-only">
          Conversación con el asistente
        </h2>

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
                      className="text-2xl font-semibold text-slate-900 sm:text-3xl"
                    />
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 [animation-delay:1.8s] motion-safe:animate-aparecer">
                      Contame un gasto o un ingreso como se lo contarías a alguien («gasté 5.000 en el súper con débito»),
                      preguntá cómo venís este mes o a cuánto está el dólar. También tenés atajos en el «+» del campo y
                      en la barra lateral.
                    </p>
                  </div>
                )}

                {/* aria-live="off": mientras la respuesta llega palabra por palabra no se anuncia (sería ruido).
                    La respuesta completa la anuncia la región de abajo cuando termina. */}
                <ol aria-label="Mensajes" aria-live="off" className="flex flex-col gap-4">
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
                centrado ? "" : "sticky bottom-0 z-10 bg-gradient-to-t from-slate-50/80 via-slate-50/40 to-transparent"
              }
            >
              <div className="mx-auto w-full max-w-3xl">
                <MessageInput
                  valor={borrador}
                  onCambio={setBorrador}
                  onEnviar={() => mandar(borrador)}
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

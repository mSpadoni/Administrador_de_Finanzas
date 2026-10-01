import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { isStaticToolUIPart } from "ai";
import { textoDe, type AsistenteUIMessage } from "@/shared/chat";
import { ResultadoDeTool } from "./TarjetasDeResultado";

// react-markdown no renderiza HTML crudo: lo que escriba el modelo no puede inyectar scripts.
// Este objeto dice cómo dibujar cada elemento del Markdown (párrafo, lista, tabla...) con estilos propios.
// `(props) => <p ... {...props} />`: recibe las props que arma react-markdown (incluido el texto) y las pasa
// todas al elemento con el spread `{...props}`, agregándole la clase de estilos.
const componentesMarkdown: Components = {
  p: (props) => <p className="my-2 first:mt-0 last:mb-0" {...props} />,
  ul: (props) => <ul className="my-2 list-disc space-y-1 pl-6" {...props} />,
  ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-6" {...props} />,
  h1: (props) => <p className="mt-3 mb-1 font-semibold" {...props} />,
  h2: (props) => <p className="mt-3 mb-1 font-semibold" {...props} />,
  h3: (props) => <p className="mt-3 mb-1 font-semibold" {...props} />,
  code: (props) => <code className="rounded bg-superficie-suave px-1 py-0.5 font-mono text-[0.9em]" {...props} />,
  pre: (props) => <pre className="my-2 overflow-x-auto rounded-lg bg-superficie-suave p-3 text-sm" {...props} />,
  // Las tablas (movimientos, totales): con scroll horizontal propio para no romper el layout en mobile.
  table: (props) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm" {...props} />
    </div>
  ),
  th: (props) => <th className="border border-borde-fuerte bg-superficie-suave px-2 py-1 font-semibold" {...props} />,
  td: (props) => <td className="border border-borde-fuerte px-2 py-1 align-top" {...props} />,
  // Una cita ("> ⚠ ...") se destaca con borde, fondo y el ícono (no solo color): el asistente la usa para avisos.
  blockquote: (props) => (
    <blockquote
      className="my-3 rounded-r-lg border-l-4 border-aviso-borde bg-aviso-suave px-3 py-2 text-aviso"
      {...props}
    />
  ),
  a: (props) => <a className="break-words text-enlace underline" target="_blank" rel="noreferrer" {...props} />,
};

/** Fuera del componente: un array nuevo en cada render haría que react-markdown vuelva a armar todo. */
const PLUGINS_DE_MARKDOWN = [remarkGfm];

/**
 * Un globo de mensaje del chat. Los del usuario van a la derecha como texto plano;
 * los del asistente a la izquierda, con las tools que usó y el Markdown convertido a HTML (tablas, listas, negritas...).
 * Con `memo`: mientras se escribe o llega una respuesta, solo se vuelve a dibujar el globo que cambió (useChat mantiene
 * el mismo objeto para los mensajes que no cambian), no todos los de la conversación.
 */
function MessageBubble({ mensaje }: { mensaje: AsistenteUIMessage }) {
  const esUsuario = mensaje.role === "user";
  // Un mensaje del AI SDK viene en partes: texto, tools usadas, inicio de cada paso...
  const texto = textoDe(mensaje, "\n\n");
  // Solo las tools que se dibujan (las que salieron bien): una que falló o quedó a medias no deja un globo vacío.
  const tarjetas = mensaje.parts
    .filter(isStaticToolUIPart)
    .filter((parte) => parte.state === "output-available" && parte.output.ok);
  if (!texto && tarjetas.length === 0) return null;

  return (
    // Las clases se arman con un template string: `${condición ? "a" : "b"}` agrega una u otra según quién escribió.
    <li className={`flex flex-col ${esUsuario ? "items-end" : "items-start"}`}>
      {/* El rol va como texto visible, no solo con color o posición. */}
      <span className="mb-1 px-1 text-xs font-medium text-tinta-suave">{esUsuario ? "Vos" : "Asistente"}</span>
      <div
        className={`max-w-[90%] min-w-0 rounded-2xl px-4 py-3 leading-relaxed [overflow-wrap:anywhere] sm:max-w-[80%] ${
          esUsuario ? "bg-marca text-sobre-marca" : "border border-borde bg-superficie text-tinta"
        }`}
      >
        {/* Lo que devolvió cada tool, dibujado como tarjeta, tabla o barras (solo si salió bien). */}
        {tarjetas.map((parte) => (
          <ResultadoDeTool key={parte.toolCallId} parte={parte} />
        ))}
        {esUsuario ? (
          <p className="whitespace-pre-wrap">{texto}</p>
        ) : (
          <ReactMarkdown remarkPlugins={PLUGINS_DE_MARKDOWN} components={componentesMarkdown}>
            {texto}
          </ReactMarkdown>
        )}
      </div>
    </li>
  );
}

export default memo(MessageBubble);

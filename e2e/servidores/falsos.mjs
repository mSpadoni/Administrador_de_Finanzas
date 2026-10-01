// Servidores falsos para los tests de punta a punta: un OpenAI y un dolarapi.com que corren en esta máquina, así ningún
// test llama a un LLM real ni a una API de internet (REGLAS-SKILLS 3.5). La app los usa porque el servidor de Next de los
// E2E arranca con OPENAI_BASE_URL y DOLARAPI_URL apuntando acá (ver playwright.config.ts).
//
// El OpenAI falso responde según el último mensaje, con el mismo formato que la API de chat completions:
// - «gasté…»: pide la tool registrar_movimiento (un gasto de $ 5.000 en el súper con débito); con su resultado, confirma.
// - «saturado»: las dos primeras veces responde 429 (como OpenAI con demasiadas consultas: el SDK reintenta una vez) y
//   después responde bien. Sirve para probar el error y el botón «Reintentar».
// - cualquier otra cosa: «Hola, soy el asistente de prueba.»
// - sin streaming (el título de la conversación): «Charla de prueba».
import { createServer } from "node:http";

export const PUERTO_OPENAI = 3101;
export const PUERTO_DOLARAPI = 3102;

/** Cuántas veces se pidió cada texto: para que «saturado» falle dos veces y después ande. */
const pedidosPorTexto = new Map();

/** El texto de un mensaje de la API de OpenAI (puede venir como texto o como lista de partes). */
const textoDe = (mensaje) =>
  typeof mensaje?.content === "string"
    ? mensaje.content
    : (mensaje?.content ?? []).map((parte) => parte.text ?? "").join(" ");

/** Un pedazo de respuesta en streaming (Server-Sent Events). */
const pedazo = (delta, finish_reason = null) =>
  `data: ${JSON.stringify({
    id: "chatcmpl-falso",
    object: "chat.completion.chunk",
    created: 0,
    model: "modelo-falso",
    choices: [{ index: 0, delta, finish_reason }],
  })}\n\n`;

const USO = { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 };
const usoFinal = `data: ${JSON.stringify({ id: "chatcmpl-falso", object: "chat.completion.chunk", created: 0, model: "modelo-falso", choices: [], usage: USO })}\n\n`;

function responderTexto(respuesta, texto) {
  respuesta.writeHead(200, { "content-type": "text/event-stream" });
  respuesta.write(pedazo({ role: "assistant", content: "" }));
  for (const palabra of texto.match(/\S+\s*/g) ?? []) respuesta.write(pedazo({ content: palabra }));
  respuesta.write(pedazo({}, "stop"));
  respuesta.write(usoFinal);
  respuesta.end("data: [DONE]\n\n");
}

function responderTool(respuesta, nombre, argumentos) {
  respuesta.writeHead(200, { "content-type": "text/event-stream" });
  respuesta.write(pedazo({ role: "assistant", content: null }));
  respuesta.write(
    pedazo({
      tool_calls: [
        {
          index: 0,
          id: "call_falso",
          type: "function",
          function: { name: nombre, arguments: JSON.stringify(argumentos) },
        },
      ],
    })
  );
  respuesta.write(pedazo({}, "tool_calls"));
  respuesta.write(usoFinal);
  respuesta.end("data: [DONE]\n\n");
}

const openai = createServer(async (pedido, respuesta) => {
  let cuerpo = "";
  for await (const parte of pedido) cuerpo += parte;
  const { messages = [], stream } = JSON.parse(cuerpo || "{}");

  // El título de la conversación se pide sin streaming.
  if (!stream) {
    respuesta.writeHead(200, { "content-type": "application/json" });
    return respuesta.end(
      JSON.stringify({
        id: "chatcmpl-falso",
        object: "chat.completion",
        created: 0,
        model: "modelo-falso",
        choices: [{ index: 0, message: { role: "assistant", content: "Charla de prueba" }, finish_reason: "stop" }],
        usage: USO,
      })
    );
  }

  const ultimo = messages.at(-1);
  if (ultimo?.role === "tool") return responderTexto(respuesta, "Listo: registré un gasto de $ 5.000 en supermercado.");

  const texto = textoDe(ultimo).toLowerCase();
  const veces = (pedidosPorTexto.get(texto) ?? 0) + 1;
  pedidosPorTexto.set(texto, veces);

  if (texto.includes("saturado") && veces <= 2) {
    respuesta.writeHead(429, { "content-type": "application/json" });
    return respuesta.end(
      JSON.stringify({
        error: { message: "Rate limit reached for requests", type: "requests", code: "rate_limit_exceeded" },
      })
    );
  }
  if (texto.includes("gasté")) {
    return responderTool(respuesta, "registrar_movimiento", {
      tipo: "gasto",
      monto: 5000,
      moneda: "ARS",
      categoria: "supermercado",
      medioDePago: "debito",
      descripcion: "Súper",
    });
  }
  return responderTexto(respuesta, "Hola, soy el asistente de prueba.");
});

const casa = (casa, compra, venta) => ({
  moneda: "USD",
  casa,
  nombre: casa,
  compra,
  venta,
  fechaActualizacion: "2026-09-29T17:00:00.000Z",
});

const dolarapi = createServer((_pedido, respuesta) => {
  respuesta.writeHead(200, { "content-type": "application/json" });
  respuesta.end(
    JSON.stringify([
      casa("oficial", 1495, 1545),
      casa("blue", 1540, 1560),
      casa("bolsa", 1537.4, 1557),
      casa("tarjeta", 1943.5, 2008.5),
    ])
  );
});

openai.listen(PUERTO_OPENAI, "127.0.0.1");
dolarapi.listen(PUERTO_DOLARAPI, "127.0.0.1");
console.log(`OpenAI falso en ${PUERTO_OPENAI}, dolarapi falso en ${PUERTO_DOLARAPI}`);

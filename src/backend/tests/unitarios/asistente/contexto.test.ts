import { convertToModelMessages } from "ai";
import { describe, expect, it } from "vitest";
import { mensajesParaElModelo, RESULTADO_RESUMIDO } from "@/backend/asistente/contexto";
import { crearToolsAsistente } from "@/backend/tools/asistente.tools";
import type { AsistenteUIMessage } from "@/shared/chat";

// Qué ve el modelo de la conversación. Regresión: cuando a las respuestas viejas se les sacaban las tools, el modelo veía
// confirmaciones ("Listo: gasto de $ 85.000…") sin la llamada a registrar_movimiento detrás y aprendía a confirmar sin
// registrar (pasó con el modelo real: dijo "Listo" y el gasto no se guardó). Sin base ni internet.

const persona = (id: string, texto: string): AsistenteUIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text: texto }],
});

const MOVIMIENTO = {
  id: "11111111-1111-4111-8111-111111111111",
  tipo: "gasto",
  monto: 85000,
  moneda: "ARS",
  montoEnPesos: 85000,
  categoria: "supermercado",
  medioDePago: "debito",
  descripcion: "Súper",
  fecha: "2026-10-01",
};

/** Una respuesta del asistente que registró un gasto con la tool y lo confirmó. */
function registroConfirmado(id: string, salida: unknown = { ok: true, movimiento: MOVIMIENTO }): AsistenteUIMessage {
  return {
    id,
    role: "assistant",
    parts: [
      { type: "step-start" },
      {
        type: "tool-registrar_movimiento",
        toolCallId: `llamada-${id}`,
        state: "output-available",
        input: { tipo: "gasto", monto: 85000, moneda: "ARS", categoria: "supermercado", medioDePago: "debito" },
        output: salida,
      },
      { type: "step-start" },
      { type: "text", text: "Listo: gasto de $ 85.000 en supermercado, con débito, hoy.", state: "done" },
    ],
  } as AsistenteUIMessage;
}

const partesDeTool = (mensaje: AsistenteUIMessage) =>
  mensaje.parts.filter((parte) => parte.type.startsWith("tool-")) as unknown as {
    type: string;
    state: string;
    input: unknown;
    output: unknown;
  }[];

describe("mensajesParaElModelo", () => {
  it("una conversación vacía queda vacía", () => {
    expect(mensajesParaElModelo([])).toEqual([]);
  });

  it("sin respuestas del asistente, los mensajes de la persona pasan tal cual", () => {
    const mensajes = [persona("p1", "Hola"), persona("p2", "¿Estás?")];

    expect(mensajesParaElModelo(mensajes)).toEqual(mensajes);
  });

  it("la última respuesta del asistente va entera, con el resultado completo de sus tools", () => {
    const ultima = registroConfirmado("a1");

    const [, enviada] = mensajesParaElModelo([persona("p1", "Gasté 85.000 en el súper con débito"), ultima]);

    expect(enviada).toEqual(ultima);
  });

  it("en una respuesta vieja queda la llamada a la tool (con sus datos de entrada) y el texto que la confirmó", () => {
    const vieja = registroConfirmado("a1");

    const [enviada] = mensajesParaElModelo([vieja, persona("p2", "¿Y ahora?"), registroConfirmado("a2")]);

    const [tool] = partesDeTool(enviada);
    expect(tool.type).toBe("tool-registrar_movimiento");
    expect(tool.input).toEqual({
      tipo: "gasto",
      monto: 85000,
      moneda: "ARS",
      categoria: "supermercado",
      medioDePago: "debito",
    });
    expect(enviada.parts.at(-1)).toMatchObject({ type: "text", text: expect.stringContaining("Listo") });
  });

  it("en una respuesta vieja, el resultado que salió bien se resume: sin los datos del movimiento", () => {
    const [enviada] = mensajesParaElModelo([registroConfirmado("a1"), persona("p2", "Otro"), registroConfirmado("a2")]);

    const [tool] = partesDeTool(enviada);
    expect(tool.output).toEqual(RESULTADO_RESUMIDO);
    expect(JSON.stringify(enviada)).not.toContain(MOVIMIENTO.id);
  });

  it("en una respuesta vieja, un fallo de la tool queda entero (es corto y explica qué pasó)", () => {
    const fallo = { ok: false, motivo: "datos_invalidos", detalle: "El monto tiene que ser mayor a cero." };

    const [enviada] = mensajesParaElModelo([
      registroConfirmado("a1", fallo),
      persona("p2", "Otro"),
      registroConfirmado("a2"),
    ]);

    expect(partesDeTool(enviada)[0].output).toEqual(fallo);
  });

  it("en una respuesta vieja, una tool que terminó con error queda; una que quedó a medias no se manda", () => {
    const vieja = {
      id: "a1",
      role: "assistant",
      parts: [
        {
          type: "tool-cotizacion_dolar",
          toolCallId: "c1",
          state: "output-error",
          input: { tipoDeDolar: "blue" },
          errorText: "Se cortó",
        },
        {
          type: "tool-cotizacion_dolar",
          toolCallId: "c2",
          state: "input-available",
          input: { tipoDeDolar: "oficial" },
        },
        { type: "reasoning", text: "Pienso…", state: "done" },
      ],
    } as AsistenteUIMessage;

    const [enviada] = mensajesParaElModelo([vieja, persona("p2", "Otro"), registroConfirmado("a2")]);

    expect(partesDeTool(enviada).map((parte) => parte.state)).toEqual(["output-error"]);
    expect(enviada.parts.some((parte) => parte.type === "reasoning")).toBe(false);
  });

  it("los mensajes de la persona no cambian, aunque estén entre respuestas viejas", () => {
    const mensajes = [persona("p1", "Gasté 85.000"), registroConfirmado("a1"), persona("p2", "Y 40.000 de nafta")];

    const enviados = mensajesParaElModelo([...mensajes, registroConfirmado("a2")]);

    expect(enviados[0]).toEqual(mensajes[0]);
    expect(enviados[2]).toEqual(mensajes[2]);
  });

  it("lo que le llega al modelo: cada confirmación vieja viene después de su llamada a registrar_movimiento", async () => {
    const enviados = mensajesParaElModelo([
      persona("p1", "Gasté 85.000 en el súper con débito"),
      registroConfirmado("a1"),
      persona("p2", "Pagué 15 dólares de Spotify con crédito"),
      registroConfirmado("a2"),
      persona("p3", "Cargué 40.000 de nafta con débito"),
    ]);

    const modelo = await convertToModelMessages(enviados, { tools: crearToolsAsistente() });

    const llamadas = modelo.flatMap((mensaje) =>
      Array.isArray(mensaje.content) ? mensaje.content.filter((parte) => parte.type === "tool-call") : []
    );
    const resultados = modelo.filter((mensaje) => mensaje.role === "tool");
    expect(llamadas).toHaveLength(2);
    expect(llamadas.every((llamada) => llamada.toolName === "registrar_movimiento")).toBe(true);
    expect(resultados).toHaveLength(2);
  });
});

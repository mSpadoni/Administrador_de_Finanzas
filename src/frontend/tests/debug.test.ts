import { describe, expect, it } from "vitest";
import type { AsistenteUIMessage } from "@/shared/chat";
import { comoTextoDeDebug, respuestasParaDebug, totalesDeDebug } from "@/frontend/chat/debug/debug";

// Lo que muestra el panel de debug: por cada respuesta, qué decidió hacer el modelo, cuánto tardó y cuántos tokens gastó.

const usuario = (texto: string): AsistenteUIMessage => ({ id: `u-${texto}`, role: "user", parts: [{ type: "text", text: texto }] });

const conTool = (id: string, metadata?: AsistenteUIMessage["metadata"]): AsistenteUIMessage => ({
  id,
  role: "assistant",
  metadata,
  parts: [
    {
      type: "tool-cotizacion_dolar",
      toolCallId: `t-${id}`,
      state: "output-available",
      input: { tipoDeDolar: "blue" },
      output: { ok: true, cotizaciones: [] },
    },
    { type: "text", text: "Listo." },
  ],
});

describe("comoTextoDeDebug", () => {
  it("muestra JSON legible y recorta lo muy largo avisando cuánto falta", () => {
    expect(comoTextoDeDebug({ tema: "colas" })).toBe('{\n  "tema": "colas"\n}');
    expect(comoTextoDeDebug("a".repeat(30), 10)).toBe(`${"a".repeat(10)}… (20 caracteres más)`);
  });
});

describe("respuestasParaDebug", () => {
  it("arma una entrada por respuesta del asistente, con el pedido que la originó y sus herramientas", () => {
    const respuestas = respuestasParaDebug([usuario("¿Y el blue?"), conTool("a1"), usuario("Gracias"), conTool("a2")]);

    expect(respuestas.map((r) => [r.id, r.pedido])).toEqual([
      ["a1", "¿Y el blue?"],
      ["a2", "Gracias"],
    ]);
    expect(respuestas[0]?.herramientas[0]).toMatchObject({
      id: "t-a1",
      nombre: "cotizacion_dolar",
      entrada: '{\n  "tipoDeDolar": "blue"\n}',
      fallo: false,
      ms: undefined,
    });
  });

  it("con la medición del servidor, cada herramienta trae lo que tardó", () => {
    const [respuesta] = respuestasParaDebug([
      usuario("¿Y el blue?"),
      conTool("a1", { herramientas: [{ id: "t-a1", nombre: "cotizacion_dolar", ms: 800 }] }),
    ]);

    expect(respuesta?.herramientas[0]?.ms).toBe(800);
    expect(respuesta?.herramientas[0]?.texto).toContain("0,8 s");
  });

  it("un resultado con ok: false se marca como fallo", () => {
    const fallida: AsistenteUIMessage = {
      id: "a",
      role: "assistant",
      parts: [
        {
          type: "tool-cotizacion_dolar",
          toolCallId: "t",
          state: "output-available",
          input: {},
          output: { ok: false, motivo: "servicio", detalle: "No respondió." },
        },
      ],
    };

    expect(respuestasParaDebug([usuario("Hola"), fallida])[0]?.herramientas[0]?.fallo).toBe(true);
  });

  it("sin mensajes no hay respuestas", () => {
    expect(respuestasParaDebug([])).toEqual([]);
  });
});

describe("totalesDeDebug", () => {
  it("suma respuestas, herramientas, demora y tokens de toda la conversación", () => {
    const respuestas = respuestasParaDebug([
      usuario("uno"),
      conTool("a1", { ms: 1000, tokens: { entrada: 100, salida: 10, total: 110 } }),
      usuario("dos"),
      conTool("a2", { ms: 2500, tokens: { entrada: 300, salida: 40, total: 340 } }),
    ]);

    expect(totalesDeDebug(respuestas)).toEqual({
      respuestas: 2,
      herramientas: 2,
      ms: 3500,
      tokens: { entrada: 400, salida: 50, total: 450 },
    });
  });

  it("las respuestas sin medición (de la base) cuentan como cero", () => {
    expect(totalesDeDebug(respuestasParaDebug([usuario("uno"), conTool("a1")])).tokens.total).toBe(0);
  });
});

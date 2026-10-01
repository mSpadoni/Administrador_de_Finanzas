import type { TextStreamPart, ToolSet } from "ai";
import { describe, expect, it } from "vitest";
import { medidorDeRespuesta } from "@/backend/asistente/medicion";

// Lo que mide el servidor de cada respuesta para mostrárselo a la persona: el modelo, cuánto tardó cada tool, los tokens
// y la demora total. Se prueba con los mismos eventos que manda el AI SDK y con un reloj que se controla (nada depende
// de la hora real).

/** Un evento del stream tal como lo manda el SDK (solo con los campos que mira el medidor). */
const evento = (datos: Record<string, unknown>) => datos as unknown as TextStreamPart<ToolSet>;
const uso = (entrada: number, salida: number) => ({
  inputTokens: entrada,
  outputTokens: salida,
  totalTokens: entrada + salida,
});

/** Un reloj que avanza a mano. */
function relojManual(inicial = 1000) {
  let ahora = inicial;
  return { reloj: () => ahora, avanzar: (ms: number) => (ahora += ms) };
}

describe("medidorDeRespuesta", () => {
  it("al empezar dice qué modelo responde", () => {
    const medir = medidorDeRespuesta("gpt-4.1");

    expect(medir(evento({ type: "start" }))).toEqual({ modelo: "gpt-4.1" });
  });

  it("mide cuánto tardó cada tool, desde que el modelo la llamó hasta que devolvió su resultado", () => {
    const { reloj, avanzar } = relojManual();
    const medir = medidorDeRespuesta("gpt-4.1", reloj(), reloj);

    medir(evento({ type: "tool-call", toolCallId: "a", toolName: "consultar_movimientos" }));
    avanzar(800);
    const primera = medir(evento({ type: "tool-result", toolCallId: "a", toolName: "consultar_movimientos" }));
    medir(evento({ type: "tool-call", toolCallId: "b", toolName: "cotizacion_dolar" }));
    avanzar(300);
    const segunda = medir(evento({ type: "tool-result", toolCallId: "b", toolName: "cotizacion_dolar" }));

    expect(primera).toEqual({ herramientas: [{ id: "a", nombre: "consultar_movimientos", ms: 800 }] });
    expect(segunda?.herramientas).toEqual([
      { id: "a", nombre: "consultar_movimientos", ms: 800 },
      { id: "b", nombre: "cotizacion_dolar", ms: 300 },
    ]);
  });

  it("una tool que falla también cuenta con lo que tardó", () => {
    const { reloj, avanzar } = relojManual();
    const medir = medidorDeRespuesta("gpt-4.1", reloj(), reloj);

    medir(evento({ type: "tool-call", toolCallId: "a", toolName: "borrar_movimiento" }));
    avanzar(120);

    expect(medir(evento({ type: "tool-error", toolCallId: "a", toolName: "borrar_movimiento" }))?.herramientas).toEqual(
      [{ id: "a", nombre: "borrar_movimiento", ms: 120 }]
    );
  });

  it("suma los tokens de cada paso y cuenta los pasos", () => {
    const medir = medidorDeRespuesta("gpt-4.1");

    const primero = medir(evento({ type: "finish-step", usage: uso(1000, 50), response: { modelId: "gpt-4.1-2026" } }));
    const segundo = medir(evento({ type: "finish-step", usage: uso(1200, 200), response: { modelId: "" } }));

    expect(primero).toEqual({ pasos: 1, modelo: "gpt-4.1-2026", tokens: { entrada: 1000, salida: 50, total: 1050 } });
    expect(segundo).toEqual({ pasos: 2, modelo: "gpt-4.1", tokens: { entrada: 2200, salida: 250, total: 2450 } });
  });

  it("al terminar da la demora total y los tokens totales", () => {
    const { reloj, avanzar } = relojManual(5000);
    const medir = medidorDeRespuesta("gpt-4.1", reloj(), reloj);
    avanzar(3400);

    expect(medir(evento({ type: "finish", totalUsage: uso(2200, 250) }))).toEqual({
      ms: 3400,
      tokens: { entrada: 2200, salida: 250, total: 2450 },
    });
  });

  it("si el proveedor no informa los tokens, cuentan como 0 y no rompe", () => {
    const medir = medidorDeRespuesta("gpt-4.1");

    expect(medir(evento({ type: "finish-step", usage: {}, response: { modelId: "m" } }))?.tokens).toEqual({
      entrada: 0,
      salida: 0,
      total: 0,
    });
  });

  it("los demás eventos (texto, etc.) no aportan nada", () => {
    const medir = medidorDeRespuesta("gpt-4.1");

    expect(medir(evento({ type: "text-delta", id: "1", text: "Hola" }))).toBeUndefined();
  });
});

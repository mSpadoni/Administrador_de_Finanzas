import { describe, expect, it } from "vitest";
import type { ParteDelAsistente, AsistenteUIMessage } from "@/shared/chat";
import { comoTextoDeDebug, respuestasParaDebug, totalesDeDebug } from "@/views/chat/debug";

// Sin mocks: mensajes y resultados con los mismos tipos que arman useChat y las tools.

const usuario = (id: string, texto: string): AsistenteUIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text: texto }],
});
const asistente = (
  id: string,
  parts: ParteDelAsistente[],
  metadata?: AsistenteUIMessage["metadata"]
): AsistenteUIMessage => ({
  id,
  role: "assistant",
  parts,
  metadata,
});

describe("comoTextoDeDebug", () => {
  it("muestra JSON legible y recorta lo muy largo avisando cuánto falta", () => {
    expect(comoTextoDeDebug({ tema: "colas" })).toBe('{\n  "tema": "colas"\n}');
    expect(comoTextoDeDebug("a".repeat(30), 10)).toBe(`${"a".repeat(10)}… (20 caracteres más)`);
  });
});

describe("respuestasParaDebug", () => {
  const mensajes: AsistenteUIMessage[] = [
    usuario("u1", "Hola"),
    asistente("a1", [{ type: "text", text: "¡Hola!" }]), // de una sesión anterior: sin metadatos
    usuario("u2", "¿Cómo vengo este mes?"),
    asistente("a2", [{ type: "text", text: "Vas $ 120.000 en gastos." }], {
      modelo: "gpt-4.1",
      pasos: 2,
      ms: 4200,
      tokens: { entrada: 900, salida: 300, total: 1200 },
    }),
  ];

  it("arma una entrada por respuesta, con el pedido del usuario y los datos del modelo", () => {
    const [primera, segunda] = respuestasParaDebug(mensajes);

    expect(primera).toMatchObject({ numero: 1, pedido: "Hola", llamadas: [], metadatos: undefined });
    expect(segunda).toMatchObject({ numero: 2, pedido: "¿Cómo vengo este mes?", llamadas: [] });
    expect(segunda.metadatos?.tokens?.total).toBe(1200);
  });

  it("los totales suman tools, tokens y demora de las respuestas que los tienen", () => {
    expect(totalesDeDebug(respuestasParaDebug(mensajes))).toEqual({ tokens: 1200, ms: 4200, llamadas: 0 });
  });
});

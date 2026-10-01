import { randomUUID } from "node:crypto";
import { RetryError } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Agente } from "@/backend/asistente/agente";
import { crearToolsAsistente } from "@/backend/tools/asistente.tools";
import { leerErrorPublico } from "@/shared/erroresShared";
import { errorDeLaApi, modeloQueFalla } from "@/backend/tests/helpers/asistente/modeloDePrueba";

// Qué ve la persona cuando el modelo falla en el medio de la respuesta: el error llega dentro del stream con un código
// estable y un mensaje sin detalles técnicos. Los errores son instancias reales de las clases del AI SDK, con el cuerpo
// que manda OpenAI. Sin base ni internet.

afterEach(() => vi.restoreAllMocks());

/** Le pide una respuesta al agente con un modelo que falla con `error` y devuelve el error que llegó en el stream. */
async function errorEnElStream(error: unknown) {
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const stream = await new Agente({ pausaEntrePalabrasMs: 0, modelo: () => modeloQueFalla(error) }).responder({
    mensajes: [{ id: randomUUID(), role: "user", parts: [{ type: "text", text: "Hola" }] }],
    tools: crearToolsAsistente(),
    alTerminar: async () => undefined,
  });
  const lector = stream.getReader();
  let errorText = "";
  for (let leido = await lector.read(); !leido.done; leido = await lector.read()) {
    if (leido.value.type === "error") errorText = leido.value.errorText;
  }
  return { publico: leerErrorPublico(errorText), errorText, log: log.mock.calls.map((llamada) => String(llamada[0])) };
}

describe("Agente — errores de OpenAI (429)", () => {
  it("sin saldo (formato actual: credit_balance_exhausted) es de configuración, no «esperá un minuto»", async () => {
    const { publico, errorText } = await errorEnElStream(
      errorDeLaApi(429, {
        message: "You have no credits remaining. Add credits to continue using the API.",
        type: "insufficient_quota",
        code: "credit_balance_exhausted",
      })
    );

    expect(publico?.codigo).toBe("asistente_no_disponible");
    expect(errorText).not.toMatch(/esperá un minuto|credits|billing/i);
  });

  it("sin saldo (formato anterior: code insufficient_quota) también es de configuración", async () => {
    const { publico } = await errorEnElStream(
      errorDeLaApi(429, {
        message: "You exceeded your current quota.",
        type: "insufficient_quota",
        code: "insufficient_quota",
      })
    );

    expect(publico?.codigo).toBe("asistente_no_disponible");
  });

  it("demasiadas consultas (rate limit) es pasajero: «asistente_saturado»", async () => {
    const { publico } = await errorEnElStream(
      errorDeLaApi(429, { message: "Rate limit reached for requests.", type: "requests", code: "rate_limit_exceeded" })
    );

    expect(publico?.codigo).toBe("asistente_saturado");
  });
});

describe("Agente — otros errores del proveedor", () => {
  it("un 5xx es pasajero, desde el borde (500) en adelante", async () => {
    expect((await errorEnElStream(errorDeLaApi(500, { message: "server error" }))).publico?.codigo).toBe(
      "asistente_saturado"
    );
    expect((await errorEnElStream(errorDeLaApi(503, { message: "overloaded" }))).publico?.codigo).toBe(
      "asistente_saturado"
    );
  });

  it("una clave sin permisos (401) es de configuración: el mensaje no filtra el detalle, pero el log sí lo guarda", async () => {
    const { publico, errorText, log } = await errorEnElStream(
      errorDeLaApi(401, { message: "Missing scopes: model.request", code: "missing_scope" })
    );

    expect(publico?.codigo).toBe("asistente_no_disponible");
    expect(errorText).not.toMatch(/scope|401/i);
    expect(log.join("\n")).toContain("Missing scopes: model.request");
  });

  it("un 4xx que no es 401 ni 429 (ej. modelo inexistente) y un error cualquiera son de configuración", async () => {
    expect(
      (await errorEnElStream(errorDeLaApi(404, { message: "The model does not exist", code: "model_not_found" })))
        .publico?.codigo
    ).toBe("asistente_no_disponible");
    expect((await errorEnElStream(new Error("algo raro"))).publico?.codigo).toBe("asistente_no_disponible");
  });

  it("si se agotaron los reintentos, cuenta el último error (acá, un rate limit)", async () => {
    const reintentos = new RetryError({
      message: "Failed after 2 attempts",
      reason: "maxRetriesExceeded",
      errors: [errorDeLaApi(503, { message: "overloaded" }), errorDeLaApi(429, { message: "Rate limit", code: "x" })],
    });

    expect((await errorEnElStream(reintentos)).publico?.codigo).toBe("asistente_saturado");
  });

  it("el timeout del SDK (DOMException «TimeoutError») es «asistente_demorado», con un mensaje para reintentar", async () => {
    const { publico } = await errorEnElStream(new DOMException("Step timeout of 1ms exceeded", "TimeoutError"));

    expect(publico).toEqual({
      codigo: "asistente_demorado",
      mensaje: "El asistente tardó demasiado en responder. Probá de nuevo en unos segundos.",
    });
  });
});

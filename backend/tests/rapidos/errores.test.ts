import { APICallError, RetryError, type UIMessageChunk } from "ai";
import { describe, expect, it } from "vitest";
import { respuestaDeError } from "@/app/api/respuestaDeError";
import { ErrorDeAplicacion } from "@/backend/erroresBackend";
import { MENSAJE_TIMEOUT, timeoutComoError, traducirError } from "@/backend/asistente/erroresAsistente";
import { CODIGOS_DE_ERROR, leerErrorPublico } from "@/shared/erroresShared";

// Sin mocks: los errores son instancias reales de las clases del AI SDK, con el cuerpo que manda OpenAI de verdad.

/** Error real de la API (como el que arma el SDK al recibir una respuesta con error). */
function errorDeApi(statusCode: number, error: Record<string, unknown>) {
  return new APICallError({
    message: String(error.message),
    url: "https://api.openai.com/v1/chat/completions",
    requestBodyValues: {},
    statusCode,
    responseBody: JSON.stringify({ error }),
    isRetryable: statusCode === 429 || statusCode >= 500,
  });
}

describe("traducirError — 429 de OpenAI", () => {
  it("sin saldo (formato actual: credit_balance_exhausted) es un error de configuración, no «esperá un minuto»", () => {
    const traducido = traducirError(
      errorDeApi(429, {
        message: "You have no credits remaining. Add credits to continue using the API.",
        type: "insufficient_quota",
        code: "credit_balance_exhausted",
        param: null,
      })
    );

    expect(traducido).toBeInstanceOf(ErrorDeAplicacion);
    expect(traducido.codigo).toBe("asistente_no_disponible");
    expect(traducido.mensajePublico).not.toMatch(/esperá un minuto|credits|billing/i);
  });

  it("sin saldo (formato anterior: code insufficient_quota) también es error de configuración", () => {
    const traducido = traducirError(
      errorDeApi(429, {
        message: "You exceeded your current quota.",
        type: "insufficient_quota",
        code: "insufficient_quota",
      })
    );

    expect(traducido.codigo).toBe("asistente_no_disponible");
  });

  it("demasiadas consultas (rate limit) es pasajero", () => {
    const traducido = traducirError(
      errorDeApi(429, { message: "Rate limit reached for requests.", type: "requests", code: "rate_limit_exceeded" })
    );

    expect(traducido.codigo).toBe("asistente_saturado");
  });
});

describe("traducirError — otros errores", () => {
  it("un 5xx del proveedor es pasajero", () => {
    expect(traducirError(errorDeApi(503, { message: "overloaded" })).codigo).toBe("asistente_saturado");
  });

  it("una clave sin permisos (401 missing_scope) es de configuración, y el mensaje no filtra el detalle", () => {
    const original = errorDeApi(401, { message: "Missing scopes: model.request", code: "missing_scope" });

    const traducido = traducirError(original);

    expect(traducido.codigo).toBe("asistente_no_disponible");
    expect(traducido.mensajePublico).not.toMatch(/scope|401/i);
    expect(traducido.cause).toBe(original); // el original queda para el log
  });

  it("si se agotaron los reintentos, se traduce el último error (acá, un rate limit)", () => {
    const reintentos = new RetryError({
      message: "Failed after 2 attempts",
      reason: "maxRetriesExceeded",
      errors: [errorDeApi(503, { message: "overloaded" }), errorDeApi(429, { message: "Rate limit", code: "x" })],
    });

    expect(traducirError(reintentos).codigo).toBe("asistente_saturado");
  });

  it("el timeout del SDK (DOMException «TimeoutError») es «asistente_demorado»", () => {
    const timeout = new DOMException("Step timeout of 1ms exceeded", "TimeoutError");

    expect(traducirError(timeout)).toMatchObject({ codigo: "asistente_demorado", mensajePublico: MENSAJE_TIMEOUT });
  });

  it("un error que ya es de la app pasa tal cual", () => {
    const limite = new ErrorDeAplicacion("limite_por_minuto", "Esperá un minuto.");

    expect(traducirError(limite)).toBe(limite);
  });
});

describe("timeoutComoError (el corte por timeout llega al usuario como error con código)", () => {
  /** Pasa los eventos por el paso real, con un stream real, y devuelve lo que sale. */
  async function pasarPor(eventos: UIMessageChunk[]): Promise<UIMessageChunk[]> {
    const salida: UIMessageChunk[] = [];
    const stream = new ReadableStream<UIMessageChunk>({
      start(controlador) {
        eventos.forEach((evento) => controlador.enqueue(evento));
        controlador.close();
      },
    }).pipeThrough(timeoutComoError());
    const lector = stream.getReader();
    for (let leido = await lector.read(); !leido.done; leido = await lector.read()) salida.push(leido.value);
    return salida;
  }

  it("un abort por TimeoutError se convierte en un error que el navegador lee con su código", async () => {
    const [evento] = await pasarPor([{ type: "abort", reason: "TimeoutError: Step timeout exceeded" }]);

    expect(evento.type).toBe("error");
    expect(evento.type === "error" && leerErrorPublico(evento.errorText)).toEqual({
      codigo: "asistente_demorado",
      mensaje: MENSAJE_TIMEOUT,
    });
  });

  it("el resto de los eventos (texto, un abort del usuario) pasan igual", async () => {
    const eventos: UIMessageChunk[] = [
      { type: "text-delta", id: "1", delta: "Hola" },
      { type: "abort", reason: "AbortError" },
    ];

    expect(await pasarPor(eventos)).toEqual(eventos);
  });
});

describe("respuestaDeError (el único lugar que traduce a HTTP)", () => {
  it("un error de la app responde su status y { error: { codigo, mensaje } }, sin la causa", async () => {
    const error = new ErrorDeAplicacion("conversacion_no_encontrada", "No encontramos esa conversación.", {
      cause: new Error("duplicate key value violates unique constraint conversaciones_pkey"),
    });

    const respuesta = respuestaDeError(error);
    const texto = await respuesta.text();

    expect(respuesta.status).toBe(404);
    expect(JSON.parse(texto)).toEqual({
      error: { codigo: "conversacion_no_encontrada", mensaje: "No encontramos esa conversación." },
    });
    expect(texto).not.toContain("duplicate key");
  });

  it("el límite por minuto responde 429 con Retry-After", () => {
    const respuesta = respuestaDeError(new ErrorDeAplicacion("limite_por_minuto", "Esperá un minuto."));

    expect(respuesta.status).toBe(429);
    expect(respuesta.headers.get("Retry-After")).toBe("60");
  });

  it("cualquier otro error (ej. Supabase caído) es un 500 genérico: el detalle no llega al navegador", async () => {
    const respuesta = respuestaDeError(new Error("connect ECONNREFUSED 127.0.0.1:54321 — secreto interno"));
    const texto = await respuesta.text();

    expect(respuesta.status).toBe(500);
    expect(leerErrorPublico(texto)?.codigo).toBe("error_interno");
    expect(texto).not.toMatch(/ECONNREFUSED|secreto/);
  });
});

describe("leerErrorPublico (el navegador reconoce solo el formato y los códigos del contrato)", () => {
  it("acepta un cuerpo con un código conocido", () => {
    for (const codigo of CODIGOS_DE_ERROR) {
      expect(leerErrorPublico(JSON.stringify({ error: { codigo, mensaje: "m" } }))).toEqual({ codigo, mensaje: "m" });
    }
  });

  it("rechaza texto suelto, el formato viejo ({ error: string }) y códigos desconocidos", () => {
    expect(leerErrorPublico("Failed to fetch")).toBeNull();
    expect(leerErrorPublico(JSON.stringify({ error: "Tu sesión expiró" }))).toBeNull();
    expect(leerErrorPublico(JSON.stringify({ error: { codigo: "inventado", mensaje: "m" } }))).toBeNull();
  });
});

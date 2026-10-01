import { describe, expect, it } from "vitest";
import { respuestaDeError } from "@/app/api/respuestaDeError";
import { ErrorDeAplicacion } from "@/backend/erroresBackend";
import { leerErrorPublico } from "@/shared/erroresShared";

// El único lugar que traduce un error de la app a HTTP (app/api/respuestaDeError.ts).

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

describe("respuestaDeError — status de cada código", () => {
  it.each([
    ["pedido_invalido", 400],
    ["no_autenticado", 401],
    ["conversacion_no_encontrada", 404],
    ["limite_por_minuto", 429],
    ["limite_por_dia", 429],
    ["asistente_no_disponible", 502],
    ["asistente_saturado", 503],
    ["asistente_demorado", 504],
  ] as const)("%s responde %i", (codigo, status) => {
    expect(respuestaDeError(new ErrorDeAplicacion(codigo, "m")).status).toBe(status);
  });

  it("el límite por día no manda Retry-After: esperar un minuto no alcanza", () => {
    expect(respuestaDeError(new ErrorDeAplicacion("limite_por_dia", "m")).headers.get("Retry-After")).toBeNull();
  });
});

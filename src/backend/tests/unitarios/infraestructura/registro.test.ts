import { afterEach, describe, expect, it, vi } from "vitest";
import { registrarAviso, registrarError, registrarEvento } from "@/backend/lib/registro";

// El registro del servidor: una línea de JSON por evento, con el detalle del error (un Error no se serializa solo).

afterEach(() => vi.restoreAllMocks());

/** La línea que se escribió en el log, leída como objeto. */
const lineaDe = (espia: { mock: { calls: unknown[][] } }) => JSON.parse(String(espia.mock.calls[0][0]));

describe("registro", () => {
  it("un evento lleva su nombre y sus datos", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    registrarEvento("chat.respuesta", { ms: 120, pasos: 2 });

    expect(lineaDe(info)).toEqual({ nivel: "info", evento: "chat.respuesta", ms: 120, pasos: 2 });
  });

  it("un aviso lleva su nombre y sus datos", () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    registrarAviso("movimientos.fila_invalida", { id: "abc" });

    expect(lineaDe(aviso)).toEqual({ nivel: "aviso", evento: "movimientos.fila_invalida", id: "abc" });
  });

  it("un error lleva nombre, mensaje y stack, y también la causa", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const causa = new Error("connection refused");

    registrarError("titulador.proponer", new Error("No se pudo", { cause: causa }), { codigo: "x" });

    const linea = lineaDe(error);
    expect(linea).toMatchObject({ nivel: "error", evento: "titulador.proponer", codigo: "x" });
    expect(linea.error).toMatchObject({ nombre: "Error", mensaje: "No se pudo" });
    expect(linea.error.stack).toContain("No se pudo");
    expect(linea.error.causa).toMatchObject({ mensaje: "connection refused" });
  });

  it("si lo que falló no es un Error (un texto, un objeto), igual queda anotado", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    registrarError("raro", "algo");

    expect(lineaDe(error).error).toBe("algo");
  });
});

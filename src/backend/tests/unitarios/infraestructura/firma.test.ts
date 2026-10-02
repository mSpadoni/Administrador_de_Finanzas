import { describe, expect, it } from "vitest";
import { firmaValida, firmar } from "@/backend/lib/firma";
import { conVariables } from "@/backend/tests/helpers/variablesDeEntorno";

// La firma de las respuestas del asistente (HMAC sobre JSON canónico). La integración prueba que el chat descarta las
// respuestas sin firma o inventadas (chat.controller.test.ts); acá, la firma en sí: qué cambia y qué no la cambia.
// La clave es la de prueba que pone vitest.config.mts.

const MENSAJE = {
  conversacionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  id: "m1",
  rol: "asistente",
  partes: [{ type: "text", text: "Listo: gasto de $ 85.000.", state: "done" }],
};

describe("firmar y firmaValida", () => {
  it("la firma de un mensaje vale para ese mensaje", () => {
    expect(firmaValida(MENSAJE, firmar(MENSAJE))).toBe(true);
  });

  it("el mismo contenido con las claves en otro orden da la misma firma (la base no conserva el orden)", () => {
    const reordenado = { ...MENSAJE, partes: [{ state: "done", text: "Listo: gasto de $ 85.000.", type: "text" }] };

    expect(firmar(reordenado)).toBe(firmar(MENSAJE));
  });

  it("un campo undefined no cambia la firma (al guardarlo en JSON desaparece)", () => {
    const conUndefined = { ...MENSAJE, partes: [{ ...MENSAJE.partes[0], providerMetadata: undefined }] };

    expect(firmar(conUndefined)).toBe(firmar(MENSAJE));
  });

  it.each([
    ["en otra conversación", { ...MENSAJE, conversacionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }],
    ["con otro id", { ...MENSAJE, id: "m2" }],
    ["como si fuera de la persona", { ...MENSAJE, rol: "usuario" }],
    ["con otro texto", { ...MENSAJE, partes: [{ ...MENSAJE.partes[0], text: "Listo: gasto de $ 1." }] }],
  ])("la firma copiada a un mensaje %s no vale", (_caso, otro) => {
    expect(firmaValida(otro, firmar(MENSAJE))).toBe(false);
  });

  it.each([
    ["sin firma", null],
    ["vacía", ""],
    ["más corta", firmar(MENSAJE).slice(0, -1)],
    ["del mismo largo pero cambiada", `${firmar(MENSAJE).slice(0, -1)}${firmar(MENSAJE).endsWith("A") ? "B" : "A"}`],
  ])("una firma %s no vale", (_caso, firma) => {
    expect(firmaValida(MENSAJE, firma)).toBe(false);
  });

  it("con otra clave, la firma de antes deja de valer", () => {
    const firma = firmar(MENSAJE);

    const valeConOtraClave = conVariables({ FIRMA_DE_MENSAJES: "otra-clave-de-prueba-de-la-firma-9876543210" }, () =>
      firmaValida(MENSAJE, firma)
    );

    expect(valeConOtraClave).toBe(false);
  });
});

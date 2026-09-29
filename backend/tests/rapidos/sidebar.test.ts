import { describe, expect, it } from "vitest";
import { conActividad, sinConversacion, type EstadoSidebar } from "@/views/chat/sidebar";

// Sin mocks: funciones puras con los mismos datos que maneja el sidebar.

const ESTADO: EstadoSidebar = {
  conversaciones: [
    { id: "a", titulo: "Gastos de septiembre" },
    { id: "b", titulo: "Dólar blue" },
  ],
};

describe("conActividad", () => {
  it("la conversación con actividad sube arriba, sin duplicarse ni cambiar su título", () => {
    expect(conActividad(ESTADO, { id: "b", titulo: "otro título" }).conversaciones).toEqual([
      { id: "b", titulo: "Dólar blue" },
      { id: "a", titulo: "Gastos de septiembre" },
    ]);
  });

  it("una conversación nueva aparece arriba con su título", () => {
    expect(conActividad(ESTADO, { id: "c", titulo: "Gasté 5000 en el súper" }).conversaciones[0]).toEqual({
      id: "c",
      titulo: "Gasté 5000 en el súper",
    });
  });
});

describe("sinConversacion", () => {
  it("la saca de la lista", () => {
    expect(sinConversacion(ESTADO, "b")).toEqual({ conversaciones: [{ id: "a", titulo: "Gastos de septiembre" }] });
  });
});

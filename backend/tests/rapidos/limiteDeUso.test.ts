import { describe, expect, it } from "vitest";
import { LIMITES_DE_USO, limiteAlcanzado } from "@/backend/models/dominio/limiteDeUso";

// Qué se le dice a la persona según el límite que alcanzó (la cuenta la hace la base: ver integracion/uso.model.test.ts).

describe("limiteAlcanzado", () => {
  it("si no alcanzó ningún límite, puede seguir", () => {
    expect(limiteAlcanzado(null)).toBeNull();
  });

  it("con el límite por minuto, le pide esperar un minuto", () => {
    expect(limiteAlcanzado("limite_por_minuto")).toEqual({
      codigo: "limite_por_minuto",
      mensaje: "Mandaste muchos mensajes seguidos. Esperá un minuto y seguí.",
    });
  });

  it("con el límite del día, se lo dice con el número de mensajes", () => {
    expect(limiteAlcanzado("limite_por_dia", { porMinuto: 3, porDia: 10 })).toEqual({
      codigo: "limite_por_dia",
      mensaje: "Llegaste al máximo de 10 mensajes por día. Mañana podés seguir.",
    });
  });

  it("los límites de la app: el del minuto es menor que el del día", () => {
    expect(LIMITES_DE_USO.porMinuto).toBeLessThan(LIMITES_DE_USO.porDia);
  });
});

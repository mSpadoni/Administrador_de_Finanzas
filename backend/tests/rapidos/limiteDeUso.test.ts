import { describe, expect, it } from "vitest";
import { LIMITES_DE_USO, limiteAlcanzado } from "@/backend/models/dominio/limiteDeUso";

describe("limiteAlcanzado", () => {
  const limites = { porMinuto: 3, porDia: 10 };

  it("por debajo de los dos límites, puede seguir", () => {
    expect(limiteAlcanzado({ ultimoMinuto: 2, ultimoDia: 9 }, limites)).toBeNull();
  });

  it("al llegar al límite por minuto, le pide esperar un minuto", () => {
    expect(limiteAlcanzado({ ultimoMinuto: 3, ultimoDia: 3 }, limites)).toMatchObject({
      codigo: "limite_por_minuto",
      mensaje: expect.stringContaining("Esperá un minuto"),
    });
  });

  it("al llegar al límite del día, se lo dice con el número (aunque el del minuto también esté lleno)", () => {
    expect(limiteAlcanzado({ ultimoMinuto: 3, ultimoDia: 10 }, limites)).toMatchObject({
      codigo: "limite_por_dia",
      mensaje: expect.stringContaining("máximo de 10 mensajes por día"),
    });
  });

  it("los límites de la app dejan estudiar tranquilo", () => {
    expect(limiteAlcanzado({ ultimoMinuto: 5, ultimoDia: 60 })).toBeNull();
    expect(LIMITES_DE_USO.porMinuto).toBeLessThan(LIMITES_DE_USO.porDia);
  });
});

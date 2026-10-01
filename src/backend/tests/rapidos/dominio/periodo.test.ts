import { describe, expect, it } from "vitest";
import { ErrorDeDominio } from "@/backend/models/dominio/erroresDominio";
import {
  contiene,
  diasDe,
  hoyEnArgentina,
  periodoAnterior,
  periodoDe,
  rango,
  resolverPeriodo,
} from "@/backend/models/dominio/periodo";

// Los períodos de las consultas (CONTEXT.md): días del calendario en hora de Argentina. Lógica pura: el "ahora"
// entra por parámetro, así ningún test depende de la fecha en que se corre.

describe("hoyEnArgentina", () => {
  it("usa la hora de Argentina: a las 23:30 del 30/9 en Buenos Aires ya es 1/10 en UTC, pero sigue siendo el 30", () => {
    expect(hoyEnArgentina(new Date("2026-10-01T02:30:00Z"))).toBe("2026-09-30");
    expect(hoyEnArgentina(new Date("2026-10-01T03:30:00Z"))).toBe("2026-10-01");
  });
});

describe("periodoDe", () => {
  it("un día es ese día", () => {
    expect(periodoDe("dia", "2026-09-29")).toEqual({ desde: "2026-09-29", hasta: "2026-09-29" });
  });

  it("una semana va de lunes a domingo", () => {
    // 29/9/2026 es martes.
    expect(periodoDe("semana", "2026-09-29")).toEqual({ desde: "2026-09-28", hasta: "2026-10-04" });
    // Un domingo pertenece a la semana que empezó el lunes anterior.
    expect(periodoDe("semana", "2026-10-04")).toEqual({ desde: "2026-09-28", hasta: "2026-10-04" });
  });

  it("un mes es el mes calendario, con su largo real (febrero bisiesto incluido)", () => {
    expect(periodoDe("mes", "2026-09-15")).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
    expect(periodoDe("mes", "2028-02-10")).toEqual({ desde: "2028-02-01", hasta: "2028-02-29" });
  });
});

describe("rango", () => {
  it("arma un período explícito y rechaza uno que termina antes de empezar", () => {
    expect(rango("2026-09-01", "2026-09-10")).toEqual({ desde: "2026-09-01", hasta: "2026-09-10" });
    expect(() => rango("2026-09-10", "2026-09-01")).toThrow(ErrorDeDominio);
    expect(rango("2026-09-10", "2026-09-10")).toEqual({ desde: "2026-09-10", hasta: "2026-09-10" }); // un solo día vale
  });
});

describe("diasDe y contiene", () => {
  it("cuenta los días de punta a punta y sabe si una fecha cae adentro", () => {
    const septiembre = periodoDe("mes", "2026-09-01");

    expect(diasDe(septiembre)).toBe(30);
    expect(diasDe(periodoDe("dia", "2026-09-01"))).toBe(1);
    expect(contiene(septiembre, "2026-09-30")).toBe(true);
    expect(contiene(septiembre, "2026-10-01")).toBe(false);
  });
});

describe("periodoAnterior", () => {
  it("de un mes, el mes calendario anterior entero (aunque tengan distinta cantidad de días)", () => {
    expect(periodoAnterior(periodoDe("mes", "2026-03-15"))).toEqual({ desde: "2026-02-01", hasta: "2026-02-28" });
    expect(periodoAnterior(periodoDe("mes", "2026-01-15"))).toEqual({ desde: "2025-12-01", hasta: "2025-12-31" });
  });

  it("de una semana, la semana anterior; de un día, el día anterior", () => {
    expect(periodoAnterior(periodoDe("semana", "2026-09-29"))).toEqual({ desde: "2026-09-21", hasta: "2026-09-27" });
    expect(periodoAnterior(periodoDe("dia", "2026-10-01"))).toEqual({ desde: "2026-09-30", hasta: "2026-09-30" });
  });

  it("de un rango cualquiera, la misma cantidad de días justo antes", () => {
    expect(periodoAnterior(rango("2026-09-11", "2026-09-20"))).toEqual({ desde: "2026-09-01", hasta: "2026-09-10" });
  });
});

describe("resolverPeriodo (lo que pide el asistente: «este mes», «la semana pasada», un rango)", () => {
  const HOY = "2026-09-17"; // jueves

  it("sin nada, es el mes de hoy", () => {
    expect(resolverPeriodo({}, HOY)).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
  });

  it("una unidad es la de hoy; con una fecha de referencia, la que contiene a esa fecha", () => {
    expect(resolverPeriodo({ unidad: "semana" }, HOY)).toEqual({ desde: "2026-09-14", hasta: "2026-09-20" });
    expect(resolverPeriodo({ unidad: "dia", referencia: "2026-09-16" }, HOY)).toEqual({
      desde: "2026-09-16",
      hasta: "2026-09-16",
    });
    expect(resolverPeriodo({ unidad: "mes", referencia: "2026-08-03" }, HOY)).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-31",
    });
  });

  it("desde y hasta arman un rango explícito (y tiene prioridad sobre la unidad)", () => {
    expect(resolverPeriodo({ desde: "2026-09-01", hasta: "2026-09-10", unidad: "semana" }, HOY)).toEqual({
      desde: "2026-09-01",
      hasta: "2026-09-10",
    });
  });

  it("solo desde es hasta hoy; un rango al revés es un error", () => {
    expect(resolverPeriodo({ desde: "2026-09-10" }, HOY)).toEqual({ desde: "2026-09-10", hasta: HOY });
    expect(() => resolverPeriodo({ desde: "2026-09-10", hasta: "2026-09-01" }, HOY)).toThrow(ErrorDeDominio);
  });
});

import { describe, expect, it } from "vitest";
import {
  fechaCorta,
  formatoMonto,
  formatoPesos,
  formatoPorcentaje,
  horaDeActualizacion,
  nombreDeCategoria,
  nombreDelMedioDePago,
  nombreDelMes,
  textoDeVariacion,
} from "@/frontend/chat/compartidos/formato";

// Cómo se escriben montos, fechas y nombres en pantalla. Intl usa espacios no cortables: se comparan con espacio común.
const igual = (texto: string) => texto.replace(/\s/g, " ");

describe("formato de montos", () => {
  it("los pesos enteros van sin decimales y con punto de miles", () => {
    expect(igual(formatoPesos(15000))).toBe("$ 15.000");
    expect(igual(formatoPesos(1234567))).toBe("$ 1.234.567");
  });

  it("los pesos con centavos siempre muestran dos decimales, con coma", () => {
    expect(igual(formatoPesos(1234.5))).toBe("$ 1.234,50");
  });

  it("un monto en dólares lleva su moneda", () => {
    expect(igual(formatoMonto(100, "USD"))).toBe("US$ 100");
    expect(igual(formatoMonto(100, "ARS"))).toBe("$ 100");
  });

  it("los porcentajes usan coma y no dejan ceros de más", () => {
    expect(formatoPorcentaje(12.5)).toBe("12,5%");
    expect(formatoPorcentaje(40)).toBe("40%");
  });
});

describe("formato de fechas", () => {
  it("una fecha AAAA-MM-DD se escribe día/mes/año sin pasar por la zona horaria", () => {
    expect(fechaCorta("2026-09-05")).toBe("05/09/2026");
  });

  it("el mes se escribe con su nombre", () => {
    expect(nombreDelMes("2026-09-15")).toBe("septiembre de 2026");
    expect(nombreDelMes("2026-01-01")).toBe("enero de 2026");
  });

  it("la actualización de una cotización se muestra en hora de Argentina (UTC−3)", () => {
    expect(horaDeActualizacion("2026-09-29T17:30:00.000Z")).toBe("29/09 14:30");
    // Cerca de medianoche UTC todavía es el día anterior en Argentina.
    expect(horaDeActualizacion("2026-10-01T01:05:00.000Z")).toBe("30/09 22:05");
  });

  it("una fecha que no se entiende no rompe la pantalla", () => {
    expect(horaDeActualizacion("no es una fecha")).toBe("sin dato");
  });
});

describe("nombres legibles", () => {
  it("las categorías y los medios de pago se escriben como los lee una persona", () => {
    expect(nombreDeCategoria("comida_afuera")).toBe("Comida afuera");
    expect(nombreDeCategoria("educacion")).toBe("Educación");
    expect(nombreDelMedioDePago("debito")).toBe("Débito");
    expect(nombreDelMedioDePago("billetera_virtual")).toBe("Billetera virtual");
  });

  it("un valor desconocido se muestra igual, sin guiones bajos", () => {
    expect(nombreDeCategoria("cosa_nueva")).toBe("cosa nueva");
  });
});

describe("variación de los gastos", () => {
  it("con texto además de la flecha, según suba o baje", () => {
    expect(textoDeVariacion(12.5)).toBe("▲ 12,5% más que el período anterior");
    expect(textoDeVariacion(-30)).toBe("▼ 30% menos que el período anterior");
    expect(textoDeVariacion(0)).toBe("Igual que el período anterior");
  });

  it("sin gastos antes no inventa un porcentaje", () => {
    expect(textoDeVariacion(null)).toBe("Sin gastos en el período anterior para comparar");
  });
});

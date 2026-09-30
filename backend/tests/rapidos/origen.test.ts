import { describe, expect, it } from "vitest";
import { origenDeLaPeticion } from "@/app/auth/origen";

// La dirección de la app para armar la URL a la que Google vuelve después del login. Un `Headers` real, sin mocks.
const cabeceras = (valores: Record<string, string>) => new Headers(valores);

describe("origenDeLaPeticion", () => {
  it("usa el Origin que manda el navegador", () => {
    expect(origenDeLaPeticion(cabeceras({ origin: "https://mi-app.vercel.app", host: "otro.com" }))).toBe(
      "https://mi-app.vercel.app"
    );
  });

  it("sin Origin, usa el host que puso Vercel, con su protocolo", () => {
    const origen = origenDeLaPeticion(
      cabeceras({ "x-forwarded-host": "mi-app.vercel.app", "x-forwarded-proto": "https", host: "interno:3000" })
    );

    expect(origen).toBe("https://mi-app.vercel.app");
  });

  it("sin Origin ni datos de Vercel, usa el host: https salvo que sea local", () => {
    expect(origenDeLaPeticion(cabeceras({ host: "mi-app.com" }))).toBe("https://mi-app.com");
    expect(origenDeLaPeticion(cabeceras({ host: "localhost:3001" }))).toBe("http://localhost:3001");
  });

  it("sin ninguna pista (desarrollo), vuelve a localhost:3000", () => {
    expect(origenDeLaPeticion(cabeceras({}))).toBe("http://localhost:3000");
  });
});

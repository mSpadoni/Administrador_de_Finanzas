import { afterEach, describe, expect, it } from "vitest";
import { ClienteDolar, type OpcionesDolar } from "@/backend/lib/dolar/clienteDolar";
import { levantarServidor, type Respuesta, type ServidorLocal } from "../helpers/servidorHttpLocal";

// Cómo maneja ClienteDolar cada respuesta posible de dolarapi.com, contra un servidor HTTP real en esta máquina
// (sin internet): cada caso es determinista y se puede contar cuántos pedidos hizo. El reloj es inyectado para
// probar el caché sin esperar 5 minutos.

const casa = (casa: string, compra: number, venta: number) => ({
  moneda: "USD",
  casa,
  nombre: casa,
  compra,
  venta,
  fechaActualizacion: "2026-09-29T17:00:00.000Z",
});
/** Lo que devuelve dolarapi.com en /v1/dolares (incluye casas que la app no usa). */
const DOLARES = [
  casa("oficial", 1495, 1545),
  casa("blue", 1540, 1560),
  casa("bolsa", 1537.4, 1557),
  casa("contadoconliqui", 1616, 1617.4),
  casa("mayorista", 1513, 1522),
  casa("cripto", 1610.64, 1613.28),
  casa("tarjeta", 1943.5, 2008.5),
];
const comoJson = { "content-type": "application/json" };
const OK: Respuesta = { status: 200, headers: comoJson, cuerpo: JSON.stringify(DOLARES) };

let servidor: ServidorLocal | undefined;
afterEach(async () => {
  await servidor?.cerrar();
  servidor = undefined;
});

/** Un servidor que responde `respuestas` en orden (la última se repite) y un cliente apuntado a él. */
async function clienteContra(respuestas: Respuesta[], opciones: OpcionesDolar = {}) {
  servidor = await levantarServidor((numero) => respuestas[Math.min(numero, respuestas.length) - 1]);
  return new ClienteDolar({ endpoint: servidor.url, esperaSinRetryAfterMs: 0, ...opciones });
}

describe("ClienteDolar.cotizaciones — respuestas del servicio", () => {
  it("un 200 devuelve las cotizaciones que usa la app (el MEP es la casa 'bolsa'), en un solo pedido", async () => {
    const dolar = await clienteContra([OK]);

    expect(await dolar.cotizaciones()).toEqual({
      ok: true,
      cotizaciones: [
        { tipoDeDolar: "oficial", compra: 1495, venta: 1545, actualizada: "2026-09-29T17:00:00.000Z" },
        { tipoDeDolar: "blue", compra: 1540, venta: 1560, actualizada: "2026-09-29T17:00:00.000Z" },
        { tipoDeDolar: "mep", compra: 1537.4, venta: 1557, actualizada: "2026-09-29T17:00:00.000Z" },
        { tipoDeDolar: "tarjeta", compra: 1943.5, venta: 2008.5, actualizada: "2026-09-29T17:00:00.000Z" },
      ],
    });
    expect(servidor!.pedidos()).toBe(1);
  });

  it("cotizacion(tipo) devuelve la de ese tipo de dólar", async () => {
    const dolar = await clienteContra([OK]);

    expect(await dolar.cotizacion("mep")).toEqual({
      ok: true,
      cotizacion: { tipoDeDolar: "mep", compra: 1537.4, venta: 1557, actualizada: "2026-09-29T17:00:00.000Z" },
    });
  });
});

describe("ClienteDolar — caché", () => {
  it("dentro de los 5 minutos no vuelve a pedir; después, sí", async () => {
    let ahora = 0;
    const dolar = await clienteContra([OK], { reloj: () => ahora });

    await dolar.cotizaciones();
    ahora = 4 * 60_000;
    await dolar.cotizacion("blue");
    expect(servidor!.pedidos()).toBe(1);

    ahora = 5 * 60_000; // justo en el límite: todavía vale
    await dolar.cotizaciones();
    expect(servidor!.pedidos()).toBe(1);

    ahora = 5 * 60_000 + 1;
    await dolar.cotizaciones();
    expect(servidor!.pedidos()).toBe(2);
  });

  it("dos consultas al mismo tiempo comparten un solo pedido", async () => {
    const dolar = await clienteContra([{ ...OK, demoraMs: 50 }]);

    const [a, b] = await Promise.all([dolar.cotizaciones(), dolar.cotizacion("oficial")]);
    expect(a.ok && b.ok).toBe(true);
    expect(servidor!.pedidos()).toBe(1);
  });

  it("un error no queda guardado: la consulta siguiente vuelve a pedir", async () => {
    const dolar = await clienteContra([{ status: 500 }, { status: 500 }, OK]);

    expect(await dolar.cotizaciones()).toMatchObject({ ok: false, motivo: "servicio" });
    expect(await dolar.cotizaciones()).toMatchObject({ ok: true });
    expect(servidor!.pedidos()).toBe(3);
  });
});

describe("ClienteDolar — reintentos", () => {
  it("un 5xx se reintenta una vez; si sigue fallando, avisa que el servicio falló", async () => {
    const dolar = await clienteContra([{ status: 502 }]);

    expect(await dolar.cotizaciones()).toMatchObject({ ok: false, motivo: "servicio" });
    expect(servidor!.pedidos()).toBe(2);
  });

  it("si el reintento sale bien, devuelve las cotizaciones", async () => {
    const dolar = await clienteContra([{ status: 503 }, OK]);

    expect(await dolar.cotizaciones()).toMatchObject({ ok: true });
    expect(servidor!.pedidos()).toBe(2);
  });

  it("un 429 que pide esperar poco (Retry-After) espera, reintenta y devuelve las cotizaciones", async () => {
    const dolar = await clienteContra([{ status: 429, headers: { "retry-after": "1" } }, OK], {
      maxEsperaReintentoMs: 1500,
    });

    expect(await dolar.cotizaciones()).toMatchObject({ ok: true });
    expect(servidor!.pedidos()).toBe(2);
  });

  it("un 429 sin Retry-After espera lo configurado y reintenta", async () => {
    const dolar = await clienteContra([{ status: 429 }, OK], { esperaSinRetryAfterMs: 10 });

    expect(await dolar.cotizaciones()).toMatchObject({ ok: true });
    expect(servidor!.pedidos()).toBe(2);
  });

  it("un 4xx que no es 429 (ej. 404) no se reintenta: la respuesta no es la esperada", async () => {
    const dolar = await clienteContra([{ status: 404 }]);

    expect(await dolar.cotizaciones()).toEqual({
      ok: false,
      motivo: "respuesta_invalida",
      detalle: "El servicio respondió HTTP 404.",
    });
    expect(servidor!.pedidos()).toBe(1);
  });

  it("un 429 que pide esperar más de lo aceptable no se reintenta", async () => {
    const dolar = await clienteContra([{ status: 429, headers: { "retry-after": "60" } }]);

    expect(await dolar.cotizaciones()).toMatchObject({ ok: false, motivo: "limite" });
    expect(servidor!.pedidos()).toBe(1);
  });
});

describe("ClienteDolar — tiempo y conexión", () => {
  it("si el servicio no contesta a tiempo, avisa que no respondió (y reintenta una vez)", async () => {
    const dolar = await clienteContra([{ ...OK, demoraMs: 500 }], { timeoutMs: 50 });

    expect(await dolar.cotizaciones()).toEqual({
      ok: false,
      motivo: "tiempo",
      detalle: "El servicio de cotizaciones no respondió en 0.05 s.",
    });
    expect(servidor!.pedidos()).toBe(2);
  });

  it("si no se puede conectar (nadie escucha en ese puerto), avisa que el servicio falló", async () => {
    const dolar = new ClienteDolar({ endpoint: "http://127.0.0.1:1", reintentos: 0 });

    expect(await dolar.cotizaciones()).toEqual({
      ok: false,
      motivo: "servicio",
      detalle: "No se pudo conectar con el servicio de cotizaciones.",
    });
  });

  it("si manda las cabeceras y se cuelga con el cuerpo, no lanza: avisa que no respondió a tiempo", async () => {
    const dolar = await clienteContra([{ ...OK, demoraDelCuerpoMs: 500 }], { timeoutMs: 50, reintentos: 0 });

    await expect(dolar.cotizaciones()).resolves.toMatchObject({ ok: false, motivo: "tiempo" });
  });

  it("ese fallo tampoco queda en el caché: la consulta siguiente vuelve a pedir y funciona", async () => {
    const dolar = await clienteContra([{ ...OK, demoraDelCuerpoMs: 500 }, OK], { timeoutMs: 50, reintentos: 0 });

    await dolar.cotizaciones();
    expect(await dolar.cotizaciones()).toMatchObject({ ok: true });
    expect(servidor!.pedidos()).toBe(2);
  });
});

describe("ClienteDolar — respuestas inválidas", () => {
  it("un 200 que no es JSON no se acepta", async () => {
    const dolar = await clienteContra([{ status: 200, headers: { "content-type": "text/html" }, cuerpo: "<html>" }]);

    expect(await dolar.cotizaciones()).toMatchObject({ ok: false, motivo: "respuesta_invalida" });
  });

  it("un JSON con otra forma o con valores imposibles no se acepta", async () => {
    const roto = DOLARES.map((d) => (d.casa === "blue" ? { ...d, venta: -3 } : d));
    const dolar = await clienteContra([{ status: 200, headers: comoJson, cuerpo: JSON.stringify(roto) }]);

    expect(await dolar.cotizaciones()).toMatchObject({ ok: false, motivo: "respuesta_invalida" });
  });

  it("una casa que la app no usa con datos raros no importa: las que sí usa llegan igual", async () => {
    const conCriptoRara = DOLARES.map((d) => (d.casa === "cripto" ? { ...d, compra: null, venta: "?" } : d));
    const dolar = await clienteContra([{ status: 200, headers: comoJson, cuerpo: JSON.stringify(conCriptoRara) }]);

    expect(await dolar.cotizaciones()).toMatchObject({ ok: true });
  });

  it("si una de las casas que usa la app viene sin compra, no se acepta", async () => {
    const blueSinCompra = DOLARES.map((d) => (d.casa === "blue" ? { ...d, compra: undefined } : d));
    const dolar = await clienteContra([{ status: 200, headers: comoJson, cuerpo: JSON.stringify(blueSinCompra) }]);

    expect(await dolar.cotizaciones()).toMatchObject({ ok: false, motivo: "respuesta_invalida" });
  });

  it("si falta alguno de los tipos de dólar que usa la app, no se acepta", async () => {
    const sinTarjeta = DOLARES.filter((d) => d.casa !== "tarjeta");
    const dolar = await clienteContra([{ status: 200, headers: comoJson, cuerpo: JSON.stringify(sinTarjeta) }]);

    expect(await dolar.cotizaciones()).toMatchObject({ ok: false, motivo: "respuesta_invalida" });
  });
});

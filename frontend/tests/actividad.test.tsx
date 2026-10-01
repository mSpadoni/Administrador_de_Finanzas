// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AsistenteUIMessage, MetadatosDeRespuesta } from "@/shared/chat";
import { duracionDeLaTool, lineasDeUso } from "@/frontend/chat/actividad";
import EstadoEnVivo from "@/frontend/chat/EstadoEnVivo";
import { formatoDuracion, formatoTokens } from "@/frontend/chat/formato";
import MessageBubble from "@/frontend/chat/MessageBubble";

// Lo que se ve de la actividad del asistente mientras responde: cada tool con lo que tardó y el contador en vivo. Los datos son los que mide el servidor (ver medicion.test.ts).
afterEach(cleanup);

describe("formato de duraciones y tokens", () => {
  it("menos de 10 s, con un decimal y coma; hasta un minuto, en segundos enteros; después, en minutos", () => {
    expect(formatoDuracion(800)).toBe("0,8 s");
    expect(formatoDuracion(3400)).toBe("3,4 s");
    expect(formatoDuracion(12_400)).toBe("12 s");
    expect(formatoDuracion(65_000)).toBe("1 min 5 s");
    // Bordes: lo que redondea a 60 s ya es un minuto (nunca «60 s» ni «1 min 60 s»).
    expect(formatoDuracion(59_400)).toBe("59 s");
    expect(formatoDuracion(59_600)).toBe("1 min 0 s");
    expect(formatoDuracion(119_600)).toBe("2 min 0 s");
  });

  it("los tokens llevan punto de miles", () => {
    expect(formatoTokens(1230)).toBe("1.230");
  });
});

const METADATOS: MetadatosDeRespuesta = {
  modelo: "gpt-4.1",
  pasos: 2,
  ms: 3400,
  tokens: { entrada: 1100, salida: 130, total: 1230 },
  herramientas: [{ id: "t1", nombre: "consultar_movimientos", ms: 800 }],
};

describe("lineasDeUso y duracionDeLaTool (lo que muestra el panel de debug)", () => {
  it("el uso detalla el modelo, el contexto enviado (entrada), la respuesta (salida) y el total de tokens", () => {
    expect(lineasDeUso(METADATOS)).toEqual([
      "Modelo: gpt-4.1 · 2 pasos",
      "Contexto enviado (entrada): 1.100 tokens",
      "Respuesta (salida): 130 tokens",
      "Total: 1.230 tokens",
    ]);
  });

  it("mientras la respuesta no terminó (o si viene de la base) no hay uso para mostrar", () => {
    expect(lineasDeUso(undefined)).toEqual([]);
    expect(lineasDeUso({ modelo: "gpt-4.1", pasos: 1 })).toEqual([]);
  });

  it("duracionDeLaTool busca la medición por el id de la llamada", () => {
    expect(duracionDeLaTool(METADATOS, "t1")).toBe(800);
    expect(duracionDeLaTool(METADATOS, "otra")).toBeUndefined();
    expect(duracionDeLaTool(undefined, "t1")).toBeUndefined();
  });
});

describe("el globo del asistente no lista las herramientas", () => {
  it("muestra el texto y las tarjetas de resultados, pero ningún bloque con los pasos: eso va en la línea de estado", () => {
    const mensaje = {
      id: "m",
      role: "assistant",
      metadata: METADATOS,
      parts: [
        {
          type: "tool-cotizacion_dolar",
          toolCallId: "t1",
          state: "output-available",
          input: {},
          output: {
            ok: true,
            cotizaciones: [{ tipoDeDolar: "blue", compra: 1400, venta: 1430, actualizada: "2026-09-29T17:30:00.000Z" }],
          },
        },
        { type: "text", text: "Está a $ 1.430." },
      ],
    } as AsistenteUIMessage;

    const { container } = render(
      <ol>
        <MessageBubble mensaje={mensaje} />
      </ol>
    );

    expect(screen.getByText("Está a $ 1.430.")).toBeVisible();
    expect(screen.getByRole("region", { name: "Cotización del dólar" })).toBeVisible(); // la tarjeta del resultado sí
    expect(container.querySelector("details")).toBeNull();
    expect(screen.queryByText(/Usó \d+ herramienta/)).toBeNull();
    expect(screen.queryByText(/tokens/)).toBeNull();
  });
});

describe("EstadoEnVivo", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("dice qué hace el asistente ahora y cuenta los segundos que lleva", () => {
    render(<EstadoEnVivo texto="Pensando…" />);

    expect(screen.getByRole("status")).toHaveTextContent("Pensando…");
    expect(screen.getByText("· 0 s")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(7000));
    expect(screen.getByText("· 7 s")).toBeInTheDocument();
  });

  it("es una sola línea que cambia según lo que hace (no se suman textos), y el contador sigue de largo", () => {
    const { rerender } = render(<EstadoEnVivo texto="Pensando…" />);
    act(() => void vi.advanceTimersByTime(3000));

    rerender(<EstadoEnVivo texto="Consultando la cotización del dólar en dolarapi.com…" />);

    const estado = screen.getByRole("status");
    expect(estado).toHaveTextContent("Consultando la cotización del dólar en dolarapi.com…");
    expect(estado).not.toHaveTextContent("Pensando…");
    expect(estado.querySelectorAll("p")).toHaveLength(1);
    expect(screen.getByText("· 3 s")).toBeInTheDocument(); // el tiempo total no se reinicia con cada paso
  });

  it("los segundos no se anuncian al lector de pantalla (sería un aviso por segundo)", () => {
    render(<EstadoEnVivo texto="Pensando…" />);

    expect(screen.getByText("· 0 s")).toHaveAttribute("aria-hidden", "true");
  });

  it("cuando ya está llegando el texto no muestra nada", () => {
    render(<EstadoEnVivo texto={null} />);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

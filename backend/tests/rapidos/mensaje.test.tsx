// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ParteDelAsistente, AsistenteUIMessage } from "@/shared/chat";
import MessageBubble from "@/views/chat/MessageBubble";

// Cómo se muestra un mensaje del chat, renderizado en un DOM (jsdom) y leído como lo leería el usuario.
// El texto del asistente lo escribe un LLM: puede traer HTML o links peligrosos (por una inyección en lo que mandó
// el usuario o en lo que guardó). Lo primero que se prueba es que eso nunca llegue a ejecutarse.
afterEach(cleanup);

const delAsistente = (texto: string, partes: ParteDelAsistente[] = []): AsistenteUIMessage => ({
  id: "m1",
  role: "assistant",
  parts: [...partes, { type: "text", text: texto }],
});

/** El globo, dentro de una lista (como en el chat). */
const mostrar = (mensaje: AsistenteUIMessage) =>
  render(
    <ol>
      <MessageBubble mensaje={mensaje} />
    </ol>
  );

describe("MessageBubble — seguridad del texto del asistente", () => {
  it("el HTML que escribe el modelo no se renderiza: ni <script>, ni <img onerror>, ni <iframe>", () => {
    const { container } = mostrar(
      delAsistente(
        'Hola <script>alert("x")</script> <img src="x" onerror="alert(1)"> <iframe src="https://malo.example"></iframe> fin'
      )
    );

    expect(container.querySelector("script, iframe")).toBeNull();
    expect(container.querySelector("img[onerror]")).toBeNull();
    expect(container).toHaveTextContent("Hola");
  });

  it("un link con javascript: no queda ejecutable", () => {
    const { container } = mostrar(delAsistente("Mirá [acá](javascript:alert(1)) y [la guía](https://example.com)."));

    for (const link of container.querySelectorAll("a")) {
      expect(link.getAttribute("href") ?? "").not.toMatch(/^\s*javascript:/i);
    }
    // Los links comunes sí funcionan, y se abren aparte sin darle acceso a la página.
    expect(screen.getByRole("link", { name: "la guía" })).toHaveAttribute("rel", "noreferrer");
  });

  it("el texto del usuario se muestra tal cual (no se interpreta como Markdown ni HTML)", () => {
    const { container } = mostrar({
      id: "m2",
      role: "user",
      parts: [{ type: "text", text: "**no es negrita** <b>tampoco</b>" }],
    });

    expect(container.querySelector("strong, b")).toBeNull();
    expect(container).toHaveTextContent("**no es negrita** <b>tampoco</b>");
  });
});

describe("MessageBubble — contenido", () => {
  it("el rol se dice con texto (no solo con color o posición)", () => {
    mostrar(delAsistente("Hola"));

    expect(screen.getByText("Asistente")).toBeInTheDocument();
  });

  it("las tablas de Markdown (movimientos, totales) se muestran como tabla", () => {
    mostrar(delAsistente(["| Categoría | Total |", "| --- | --- |", "| Supermercado | $ 50.000 |"].join("\n")));

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "$ 50.000" })).toBeInTheDocument();
  });

  it("las herramientas no se listan en el globo: lo que hace el asistente se ve en vivo, fuera de la respuesta", () => {
    const parte = (state: "input-available" | "output-available"): ParteDelAsistente =>
      state === "input-available"
        ? { type: "tool-cotizacion_dolar", toolCallId: "t1", state, input: {} }
        : {
            type: "tool-cotizacion_dolar",
            toolCallId: "t2",
            state,
            input: {},
            output: { ok: false, motivo: "servicio", detalle: "El servicio de cotizaciones falló (HTTP 503)." },
          };
    mostrar(delAsistente("Un momento.", [parte("input-available"), parte("output-available")]));

    expect(screen.queryByRole("list", { name: "Pasos de la respuesta" })).toBeNull();
    expect(screen.queryByText("Consultando la cotización del dólar…")).toBeNull();
    expect(screen.getByText("Un momento.")).toBeVisible();
  });
});

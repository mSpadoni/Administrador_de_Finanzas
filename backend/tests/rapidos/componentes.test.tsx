// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_CARACTERES_MENSAJE, type AsistenteUIMessage } from "@/shared/chat";
import type { CodigoDeError } from "@/shared/errores";
import PaginaDeError from "@/app/error";
import PaginaNoEncontrada from "@/app/not-found";
import Atajos from "@/views/chat/Atajos";
import AvisoDeError from "@/views/chat/AvisoDeError";
import MessageInput from "@/views/chat/MessageInput";
import PanelDeDebug from "@/views/chat/PanelDeDebug";

// Sin mocks: los componentes reales, renderizados en un DOM (jsdom) y usados como un usuario (teclado y clicks).
// Se buscan los elementos por su rol y su nombre accesible, igual que un lector de pantalla.
// `vi.fn()` solo registra que el componente llamó a la función que le pasó su padre (no reemplaza nada del código).
afterEach(cleanup);

/** Un error como el que arma useChat con lo que respondió el servidor. */
const errorDelServidor = (codigo: CodigoDeError, mensaje = "Mensaje para el usuario.") =>
  new Error(JSON.stringify({ error: { codigo, mensaje } }));

describe("AvisoDeError", () => {
  it("un error pasajero se anuncia (role=alert) y ofrece «Reintentar»", async () => {
    const reintentar = vi.fn();
    render(
      <AvisoDeError error={errorDelServidor("asistente_demorado", "Tardó demasiado.")} onReintentar={reintentar} />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Tardó demasiado.");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reintentar).toHaveBeenCalledOnce();
  });

  it("con el límite del día no ofrece reintentar (no serviría)", () => {
    render(<AvisoDeError error={errorDelServidor("limite_por_dia")} onReintentar={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("con la sesión vencida ofrece volver a ingresar", () => {
    render(<AvisoDeError error={errorDelServidor("no_autenticado")} onReintentar={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Volver a ingresar" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("un error que no vino del servidor no muestra su texto crudo", () => {
    render(<AvisoDeError error={new Error("TypeError: stack interno")} onReintentar={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Revisá tu conexión");
    expect(screen.getByRole("alert")).not.toHaveTextContent("stack interno");
  });
});

/** MessageInput es controlado: en la app el estado lo tiene ChatWindow. Acá, un padre mínimo igual. */
function CampoConEstado({ generando = false, onEnviar = vi.fn(), onDetener = vi.fn(), inicial = "" }) {
  const [valor, setValor] = useState(inicial);
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <MessageInput
      valor={valor}
      onCambio={setValor}
      onEnviar={onEnviar}
      onDetener={onDetener}
      generando={generando}
      textareaRef={ref}
    />
  );
}

describe("MessageInput", () => {
  it("tiene un label visible y no deja enviar un mensaje vacío", () => {
    render(<CampoConEstado />);

    expect(screen.getByRole("textbox", { name: "Tu mensaje" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("Enter envía; Shift+Enter hace un salto de línea sin enviar", async () => {
    const enviar = vi.fn();
    render(<CampoConEstado onEnviar={enviar} />);
    const campo = screen.getByRole("textbox", { name: "Tu mensaje" });

    await userEvent.type(campo, "Hola{Shift>}{Enter}{/Shift}asistente");
    expect(enviar).not.toHaveBeenCalled();
    expect(campo).toHaveValue("Hola\nasistente");

    await userEvent.type(campo, "{Enter}");
    expect(enviar).toHaveBeenCalledOnce();
  });

  it("si el mensaje es demasiado largo lo marca como inválido, explica por qué y no deja enviar", () => {
    render(<CampoConEstado inicial={"a".repeat(MAX_CARACTERES_MENSAJE + 1)} />);
    const campo = screen.getByRole("textbox", { name: "Tu mensaje" });

    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription(expect.stringContaining(`el máximo es ${MAX_CARACTERES_MENSAJE}`));
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("mientras el asistente responde, el botón pasa a «Detener»", async () => {
    const detener = vi.fn();
    render(<CampoConEstado generando onDetener={detener} />);

    expect(screen.queryByRole("button", { name: "Enviar" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Detener/ }));
    expect(detener).toHaveBeenCalledOnce();
  });
});

describe("Atajos", () => {
  it("cada atajo manda su mensaje, y se deshabilitan mientras el asistente responde", async () => {
    const usar = vi.fn();
    const { rerender } = render(<Atajos onUsar={usar} deshabilitados={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Registrar un gasto" }));
    expect(usar).toHaveBeenCalledWith("Registrá un gasto: ");

    rerender(<Atajos onUsar={usar} deshabilitados />);
    for (const boton of within(screen.getByRole("list", { name: "Atajos" })).getAllByRole("button")) {
      expect(boton).toBeDisabled();
    }
  });
});

describe("PanelDeDebug", () => {
  const mensajes: AsistenteUIMessage[] = [
    { id: "u1", role: "user", parts: [{ type: "text", text: "¿A cuánto está el blue?" }] },
    {
      id: "a1",
      role: "assistant",
      parts: [
        {
          type: "tool-cotizacion_dolar",
          toolCallId: "t1",
          state: "output-available",
          input: { tipoDeDolar: "blue" },
          output: {
            ok: true,
            cotizaciones: [{ tipoDeDolar: "blue", compra: 1540, venta: 1560, actualizada: "2026-09-29T17:00:00.000Z" }],
          },
        },
        { type: "text", text: "Está a $ 1.560." },
      ],
      metadata: { modelo: "gpt-4o-mini", pasos: 2, ms: 3500, tokens: { entrada: 800, salida: 200, total: 1000 } },
    },
  ];

  it("abierto, muestra qué tool usó el modelo (en palabras del usuario y su nombre técnico) y los tokens", () => {
    render(<PanelDeDebug id="panel" mensajes={mensajes} abierto onCerrar={vi.fn()} />);
    const panel = screen.getByRole("complementary", { name: "Panel de debug" });

    expect(within(panel).getByText("Consultó la cotización del dólar")).toBeInTheDocument();
    expect(within(panel).getByText("cotizacion_dolar")).toBeInTheDocument();
    expect(within(panel).getByText("800 / 200")).toBeInTheDocument(); // tokens de entrada / salida
  });

  it("al abrirse lleva el foco al botón de cerrar, y Escape lo cierra (teclado)", async () => {
    const cerrar = vi.fn();
    render(<PanelDeDebug id="panel" mensajes={mensajes} abierto onCerrar={cerrar} />);

    expect(screen.getByRole("button", { name: "Cerrar el panel de debug" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(cerrar).toHaveBeenCalledOnce();
  });

  it("sin respuestas todavía, dice qué va a aparecer (estado vacío)", () => {
    render(<PanelDeDebug id="panel" mensajes={[]} abierto onCerrar={vi.fn()} />);

    expect(screen.getByText("Cuando el asistente responda, acá vas a ver qué hizo.")).toBeInTheDocument();
  });
});

describe("páginas de error y de «no encontrado»", () => {
  it("si una página falla: lo dice sin el detalle técnico, deja reintentar y volver al inicio", async () => {
    const reintentar = vi.fn();
    render(<PaginaDeError error={new Error("connect ECONNREFUSED 127.0.0.1")} reset={reintentar} />);

    expect(screen.getByRole("heading", { level: 1, name: "No pudimos cargar esta página" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).not.toHaveTextContent("ECONNREFUSED");
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reintentar).toHaveBeenCalledOnce();
  });

  it("una dirección que no existe tiene su propia página, con salida al inicio", () => {
    render(<PaginaNoEncontrada />);

    expect(screen.getByRole("heading", { level: 1, name: "No encontramos esta página" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  });
});

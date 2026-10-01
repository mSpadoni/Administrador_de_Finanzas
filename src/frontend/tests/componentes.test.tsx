// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_CARACTERES_MENSAJE, type AsistenteUIMessage } from "@/shared/chat";
import type { CodigoDeError } from "@/shared/erroresShared";
import PaginaDeError from "@/app/error";
import PaginaNoEncontrada from "@/app/not-found";
import DialogoDeConfirmacion from "@/frontend/compartidos/DialogoDeConfirmacion";
import AvisoDeError from "@/frontend/chat/conversacion/AvisoDeError";
import MenuDeAtajos from "@/frontend/chat/conversacion/MenuDeAtajos";
import MessageInput from "@/frontend/chat/conversacion/MessageInput";
import PerfilDeUsuario from "@/frontend/chat/sidebar/PerfilDeUsuario";
import PanelDeDebug from "@/frontend/chat/debug/PanelDeDebug";
import { ATAJOS } from "@/frontend/chat/conversacion/respuesta";

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
function CampoConEstado({
  generando = false,
  onEnviar = vi.fn(),
  onDetener = vi.fn(),
  onUsarAtajo = vi.fn(),
  inicial = "",
}) {
  const [valor, setValor] = useState(inicial);
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <MessageInput
      valor={valor}
      onCambio={setValor}
      onEnviar={onEnviar}
      onDetener={onDetener}
      onUsarAtajo={onUsarAtajo}
      generando={generando}
      textareaRef={ref}
    />
  );
}

describe("MessageInput", () => {
  it("tiene su label para el lector de pantalla y no deja enviar un mensaje vacío", () => {
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

describe("MessageInput — una fila o dos", () => {
  const contenedorDe = () => screen.getByRole("textbox", { name: "Tu mensaje" }).closest("[data-expandida]");

  it("con una línea de texto, el «+», el texto y el botón de enviar van en una sola fila", async () => {
    render(<CampoConEstado />);

    await userEvent.type(screen.getByRole("textbox", { name: "Tu mensaje" }), "Gasté 5.000");

    expect(contenedorDe()).toHaveAttribute("data-expandida", "false");
  });

  it("con un salto de línea, los botones bajan a una segunda fila; al vaciar el campo vuelven a la primera", async () => {
    render(<CampoConEstado />);
    const campo = screen.getByRole("textbox", { name: "Tu mensaje" });

    await userEvent.type(campo, "Hola{Shift>}{Enter}{/Shift}asistente");
    expect(contenedorDe()).toHaveAttribute("data-expandida", "true");

    await userEvent.clear(campo);
    expect(contenedorDe()).toHaveAttribute("data-expandida", "false");
    await userEvent.type(campo, "Hola"); // se empieza de cero: una línea, una fila
    expect(contenedorDe()).toHaveAttribute("data-expandida", "false");
  });

  it("los dos botones siguen funcionando en la segunda fila", async () => {
    const enviar = vi.fn();
    render(<CampoConEstado onEnviar={enviar} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Tu mensaje" }), "Hola{Shift>}{Enter}{/Shift}asistente");

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(enviar).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Atajos" })).toBeEnabled();
  });
});

describe("MessageInput — el «+» de los atajos", () => {
  it("elegir un atajo del menú le avisa al padre cuál fue", async () => {
    const usar = vi.fn();
    render(<CampoConEstado onUsarAtajo={usar} />);

    await userEvent.click(screen.getByRole("button", { name: "Atajos" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Resumen del mes/ }));

    expect(usar).toHaveBeenCalledWith(ATAJOS.find((atajo) => atajo.id === "resumen-del-mes"));
  });

  it("mientras el asistente responde, el «+» queda deshabilitado", () => {
    render(<CampoConEstado generando />);

    expect(screen.getByRole("button", { name: "Atajos" })).toBeDisabled();
  });
});

describe("MenuDeAtajos", () => {
  it("abre un menú con todos los atajos; elegir uno lo usa, cierra el menú y devuelve el foco al botón", async () => {
    const usar = vi.fn();
    render(<MenuDeAtajos onUsar={usar} deshabilitado={false} />);
    const boton = screen.getByRole("button", { name: "Atajos" });
    expect(boton).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(boton);

    expect(boton).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("menu", { name: "Atajos" });
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(ATAJOS.length);
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Gastos por categoría/ }));
    expect(usar).toHaveBeenCalledWith(ATAJOS.find((atajo) => atajo.id === "gastos-por-categoria"));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(boton).toHaveFocus();
  });

  it("con el teclado: al abrir el foco va al primer ítem, las flechas recorren y Escape cierra", async () => {
    render(<MenuDeAtajos onUsar={vi.fn()} deshabilitado={false} />);
    const boton = screen.getByRole("button", { name: "Atajos" });

    await userEvent.click(boton);
    const items = screen.getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(items.at(-1)).toHaveFocus(); // da la vuelta
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).toBeNull();
    expect(boton).toHaveFocus();
  });

  it("un click afuera lo cierra", async () => {
    render(
      <>
        <button type="button">Afuera</button>
        <MenuDeAtajos onUsar={vi.fn()} deshabilitado={false} />
      </>
    );
    await userEvent.click(screen.getByRole("button", { name: "Atajos" }));

    await userEvent.click(screen.getByRole("button", { name: "Afuera" }));

    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("DialogoDeConfirmacion", () => {
  const props = {
    abierto: true,
    titulo: "¿Borrar la conversación?",
    descripcion: "No se puede deshacer.",
    textoConfirmar: "Borrar",
    onConfirmar: vi.fn(),
    onCancelar: vi.fn(),
  };

  it("cerrado no muestra nada", () => {
    render(<DialogoDeConfirmacion {...props} abierto={false} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("abierto es un diálogo con título y descripción, y el foco arranca en «Cancelar» (la opción segura)", () => {
    render(<DialogoDeConfirmacion {...props} />);

    const dialogo = screen.getByRole("dialog", { name: "¿Borrar la conversación?" });
    expect(dialogo).toHaveAccessibleDescription("No se puede deshacer.");
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });

  it("confirmar y cancelar avisan al padre; Escape también cancela", async () => {
    const confirmar = vi.fn();
    const cancelar = vi.fn();
    render(<DialogoDeConfirmacion {...props} onConfirmar={confirmar} onCancelar={cancelar} />);

    await userEvent.click(screen.getByRole("button", { name: "Borrar" }));
    expect(confirmar).toHaveBeenCalledOnce();
    await userEvent.keyboard("{Escape}");
    expect(cancelar).toHaveBeenCalledOnce();
  });

  it("el foco no sale del diálogo: Shift+Tab desde «Cancelar» va a «Borrar» y Tab desde «Borrar» vuelve", async () => {
    render(<DialogoDeConfirmacion {...props} />);

    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Borrar" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });

  it("mientras se hace la acción los botones se deshabilitan, dice qué está pasando y Escape no cancela", async () => {
    const cancelar = vi.fn();
    render(<DialogoDeConfirmacion {...props} pendiente textoPendiente="Borrando…" onCancelar={cancelar} />);

    expect(screen.getByRole("button", { name: "Borrando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    expect(cancelar).not.toHaveBeenCalled();
  });
});

describe("PerfilDeUsuario", () => {
  it("muestra el nombre y, sin foto, la inicial", () => {
    render(<PerfilDeUsuario nombre="Mateo Spadoni" avatarUrl={null} cerrarSesion={vi.fn()} onAbrirDebug={vi.fn()} />);

    const boton = screen.getByRole("button", { name: "Cuenta de Mateo Spadoni" });
    expect(boton).toHaveTextContent("Mateo Spadoni");
    expect(boton).toHaveTextContent("M");
  });

  it("con foto la muestra como imagen decorativa (el nombre ya está al lado)", () => {
    const { container } = render(
      <PerfilDeUsuario nombre="Mateo" avatarUrl="https://lh3.googleusercontent.com/foto" cerrarSesion={vi.fn()} onAbrirDebug={vi.fn()} />
    );

    expect(container.querySelector("img")).toHaveAttribute("src", "https://lh3.googleusercontent.com/foto");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("el menú del perfil tiene el «Panel de debug» como función secundaria", async () => {
    const abrirDebug = vi.fn();
    render(<PerfilDeUsuario nombre="Mateo" avatarUrl={null} cerrarSesion={vi.fn()} onAbrirDebug={abrirDebug} />);

    await userEvent.click(screen.getByRole("button", { name: "Cuenta de Mateo" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Panel de debug" }));

    expect(abrirDebug).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("«Cerrar sesión» pregunta antes; recién al confirmar cierra la sesión", async () => {
    const cerrarSesion = vi.fn().mockResolvedValue(undefined);
    render(<PerfilDeUsuario nombre="Mateo" avatarUrl={null} cerrarSesion={cerrarSesion} onAbrirDebug={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Cuenta de Mateo" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));
    const dialogo = screen.getByRole("dialog", { name: "¿Cerrar sesión?" });
    expect(cerrarSesion).not.toHaveBeenCalled();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(cerrarSesion).toHaveBeenCalledOnce());
  });

  it("si se arrepiente y cancela, no cierra la sesión", async () => {
    const cerrarSesion = vi.fn();
    render(<PerfilDeUsuario nombre="Mateo" avatarUrl={null} cerrarSesion={cerrarSesion} onAbrirDebug={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Cuenta de Mateo" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(cerrarSesion).not.toHaveBeenCalled();
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
      metadata: {
        modelo: "gpt-4.1",
        pasos: 2,
        ms: 3500,
        tokens: { entrada: 800, salida: 200, total: 1000 },
        herramientas: [{ id: "t1", nombre: "cotizacion_dolar", ms: 800 }],
      },
    },
  ];

  it("cerrado no existe", () => {
    render(<PanelDeDebug mensajes={mensajes} abierto={false} onCerrar={vi.fn()} />);

    expect(screen.queryByRole("complementary", { name: "Panel de debug" })).toBeNull();
  });

  it("abierto muestra la herramienta que decidió usar el modelo (con lo que tardó y su nombre técnico) y los tokens", () => {
    render(<PanelDeDebug mensajes={mensajes} abierto onCerrar={vi.fn()} />);
    const panel = screen.getByRole("complementary", { name: "Panel de debug" });

    expect(within(panel).getByText(/Consultó la cotización del dólar · 0,8 s/)).toBeInTheDocument();
    expect(within(panel).getByText("cotizacion_dolar")).toBeInTheDocument();
    expect(within(panel).getByText("Pedido: «¿A cuánto está el blue?»")).toBeInTheDocument();
    expect(within(panel).getByText("Modelo: gpt-4.1 · 2 pasos")).toBeInTheDocument();
    expect(within(panel).getByText("Contexto enviado (entrada): 800 tokens")).toBeInTheDocument();
    const totales = within(panel).getByRole("region", { name: "Totales de la conversación" });
    expect(totales).toHaveTextContent("1 respuesta · 1 herramienta · 3,5 s");
    expect(totales).toHaveTextContent("1.000 tokens");
  });

  it("«Ver datos» muestra lo que decidió pasarle el modelo y lo que devolvió la tool", async () => {
    render(<PanelDeDebug mensajes={mensajes} abierto onCerrar={vi.fn()} />);

    await userEvent.click(screen.getByText("Ver datos"));

    // «blue» aparece en lo que decidió pasarle el modelo y en lo que devolvió la tool; la compra, solo en el resultado.
    expect(screen.getAllByText(/"tipoDeDolar": "blue"/, { selector: "pre" })).toHaveLength(2);
    expect(screen.getByText(/"compra": 1540/, { selector: "pre" })).toBeVisible();
  });

  it("una respuesta sin herramientas lo dice", () => {
    const sinTools: AsistenteUIMessage[] = [
      { id: "u", role: "user", parts: [{ type: "text", text: "Hola" }] },
      { id: "a", role: "assistant", parts: [{ type: "text", text: "¡Hola!" }] },
    ];
    render(<PanelDeDebug mensajes={sinTools} abierto onCerrar={vi.fn()} />);

    expect(screen.getByText("El modelo respondió sin usar herramientas.")).toBeInTheDocument();
  });

  it("al abrirse lleva el foco al botón de cerrar, y Escape lo cierra (teclado)", async () => {
    const cerrar = vi.fn();
    render(<PanelDeDebug mensajes={mensajes} abierto onCerrar={cerrar} />);

    expect(screen.getByRole("button", { name: "Cerrar el panel de debug" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(cerrar).toHaveBeenCalledOnce();
  });

  it("sin respuestas todavía, dice qué va a aparecer (estado vacío)", () => {
    render(<PanelDeDebug mensajes={[]} abierto onCerrar={vi.fn()} />);

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

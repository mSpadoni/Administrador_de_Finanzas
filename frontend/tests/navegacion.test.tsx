// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AsistenteUIMessage } from "@/shared/chat";
import BarraLateral from "@/frontend/chat/BarraLateral";
import { ProveedorDelChat, useChatEnPantalla } from "@/frontend/chat/ContextoDelChat";
import { ProveedorSidebar, useSidebar } from "@/frontend/chat/EstadoSidebar";
import { esClickComun, idDeConversacionEnLaUrl, urlDeConversacion } from "@/frontend/chat/navegacion";
import TextoEscribiendose from "@/frontend/chat/TextoEscribiendose";

// Cambiar de conversación (nueva, abrir una guardada, borrar, atrás) se resuelve en el navegador, sin pedirle al servidor
// la página entera: por eso no hay un momento en blanco y la transición se puede animar. Los componentes reales, en un DOM
// (jsdom). Lo único que se reemplaza es el router de Next (no existe fuera de la app) y las acciones del servidor.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

afterEach(cleanup);

const ID_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const mensaje = (id: string, role: "user" | "assistant", text: string): AsistenteUIMessage => ({
  id,
  role,
  parts: [{ type: "text", text }],
});
const CHARLA_A = [mensaje("m1", "user", "Gasté 5000"), mensaje("m2", "assistant", "Anotado.")];
const CHARLA_B = [mensaje("m3", "user", "¿Y el dólar?")];

describe("las direcciones de las conversaciones", () => {
  it("se arman y se leen de vuelta", () => {
    expect(urlDeConversacion(ID_A)).toBe(`/conversacion/${ID_A}`);
    expect(idDeConversacionEnLaUrl(`/conversacion/${ID_A}`)).toBe(ID_A);
    expect(idDeConversacionEnLaUrl(`/conversacion/${ID_A}/`)).toBe(ID_A);
  });

  it("lo que no es la dirección de una conversación no tiene id", () => {
    expect(idDeConversacionEnLaUrl("/")).toBeNull();
    expect(idDeConversacionEnLaUrl("/conversacion/abc")).toBeNull();
    expect(idDeConversacionEnLaUrl(`/otra/${ID_A}`)).toBeNull();
  });

  it("con Ctrl, Cmd, Shift o el botón del medio se abre en otra pestaña: no es un click común", () => {
    const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

    expect(esClickComun(click)).toBe(true);
    expect(esClickComun({ ...click, ctrlKey: true })).toBe(false);
    expect(esClickComun({ ...click, metaKey: true })).toBe(false);
    expect(esClickComun({ ...click, shiftKey: true })).toBe(false);
    expect(esClickComun({ ...click, button: 1 })).toBe(false);
    expect(esClickComun({ ...click, altKey: true })).toBe(false);
  });
});

/** Lo que se ve de la conversación abierta, para comprobar los cambios. */
function ConversacionAbierta() {
  const { conversacionId, messages } = useChatEnPantalla();
  return (
    <p>
      Abierta: {conversacionId} con {messages.length} mensajes
    </p>
  );
}

/** Un botón que le cambia el título a la conversación B, como cuando el servidor devuelve el que puso el asistente. */
function CambiarTitulo() {
  const { cambiarTitulo } = useSidebar();
  return (
    <button type="button" onClick={() => cambiarTitulo(ID_B, "Cotización del dólar blue")}>
      Titular
    </button>
  );
}

function pantalla({
  mensajes = CHARLA_A,
  leer = vi.fn().mockResolvedValue(CHARLA_B),
  borrar = vi.fn().mockResolvedValue(undefined),
} = {}) {
  render(
    <ProveedorSidebar
      inicial={{
        conversaciones: [
          { id: ID_A, titulo: "Gastos de septiembre" },
          { id: ID_B, titulo: "Dólar" },
        ],
      }}
    >
      <ProveedorDelChat
        conversacionId={ID_A}
        mensajesIniciales={mensajes}
        leerConversacion={leer}
        retitular={vi.fn().mockResolvedValue(null)}
      >
        <ConversacionAbierta />
        <CambiarTitulo />
        <BarraLateral borrar={borrar} usuario={{ nombre: "Mateo", avatarUrl: null }} cerrarSesion={vi.fn()} />
      </ProveedorDelChat>
    </ProveedorSidebar>
  );
  return { leer, borrar };
}

const abierta = () => screen.getByText(/^Abierta:/).textContent;

describe("cambiar de conversación sin recargar", () => {
  beforeEach(() => window.history.replaceState(null, "", urlDeConversacion(ID_A)));

  it("si se elige otra cosa mientras una conversación se está abriendo, gana lo último que se eligió", async () => {
    // Regresión: antes, la lectura que terminaba última pisaba la pantalla aunque la persona ya hubiera elegido otra cosa.
    let terminarDeLeer: (mensajes: AsistenteUIMessage[]) => void = () => undefined;
    const leer = vi.fn(() => new Promise<AsistenteUIMessage[]>((listo) => (terminarDeLeer = listo)));
    pantalla({ leer });

    await userEvent.click(screen.getByRole("link", { name: "Dólar" })); // B empieza a abrirse (lento)
    await userEvent.click(screen.getByRole("link", { name: "Nueva conversación" })); // y la persona pide una nueva
    await act(async () => terminarDeLeer(CHARLA_B)); // recién ahí llega B

    expect(abierta()).toMatch(/Abierta: [0-9a-f-]{36} con 0 mensajes/);
    expect(abierta()).not.toContain(ID_B);
  });

  it("«Nueva conversación» abre una vacía, con otra dirección, sin pedirle nada al servidor", async () => {
    const { leer } = pantalla();

    await userEvent.click(screen.getByRole("link", { name: "Nueva conversación" }));

    expect(abierta()).toMatch(/Abierta: [0-9a-f-]{36} con 0 mensajes/);
    expect(abierta()).not.toContain(ID_A);
    expect(idDeConversacionEnLaUrl(window.location.pathname)).not.toBe(ID_A);
    expect(idDeConversacionEnLaUrl(window.location.pathname)).not.toBeNull();
    expect(leer).not.toHaveBeenCalled();
  });

  it("si la conversación abierta todavía está vacía, no crea otra: solo enfoca el campo", async () => {
    pantalla({ mensajes: [] });

    await userEvent.click(screen.getByRole("link", { name: "Nueva conversación" }));

    expect(abierta()).toBe(`Abierta: ${ID_A} con 0 mensajes`);
    expect(window.location.pathname).toBe(urlDeConversacion(ID_A));
  });

  it("abrir una conversación de la lista trae su historial y marca esa como la actual", async () => {
    const { leer } = pantalla();

    await userEvent.click(screen.getByRole("link", { name: "Dólar" }));

    await waitFor(() => expect(abierta()).toBe(`Abierta: ${ID_B} con 1 mensajes`));
    expect(leer).toHaveBeenCalledWith(ID_B);
    expect(window.location.pathname).toBe(urlDeConversacion(ID_B));
    expect(screen.getByRole("link", { name: "Dólar" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Gastos de septiembre" })).not.toHaveAttribute("aria-current");
  });

  it("el botón «atrás» del navegador vuelve a mostrar la conversación de la dirección", async () => {
    const { leer } = pantalla();
    await userEvent.click(screen.getByRole("link", { name: "Dólar" }));
    await waitFor(() => expect(abierta()).toContain(ID_B));
    leer.mockResolvedValueOnce(CHARLA_A);

    // El navegador cambia la dirección y avisa con «popstate» (acá se simula igual).
    window.history.replaceState(null, "", urlDeConversacion(ID_A));
    act(() => void window.dispatchEvent(new PopStateEvent("popstate")));

    await waitFor(() => expect(abierta()).toBe(`Abierta: ${ID_A} con 2 mensajes`));
  });
});

describe("el título de las conversaciones", () => {
  it("cuando el asistente le pone un título nuevo, la lista lo muestra en el mismo lugar", async () => {
    pantalla();

    await userEvent.click(screen.getByRole("button", { name: "Titular" }));

    expect(screen.getByRole("link", { name: "Cotización del dólar blue" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dólar" })).toBeNull();
    // Sigue en su lugar: el título cambia, la conversación no se mueve ni se duplica.
    expect(screen.getAllByRole("link", { name: /Gastos de septiembre|Cotización del dólar blue/ })).toHaveLength(2);
  });
});

describe("borrar una conversación", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", urlDeConversacion(ID_A));
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => vi.useRealTimers());

  /** Pide borrar una conversación de la lista y confirma en el diálogo. */
  async function borrarDeLaLista(titulo: string) {
    await userEvent.click(screen.getByRole("button", { name: `Borrar la conversación «${titulo}»` }));
    const dialogo = screen.getByRole("dialog", { name: "¿Borrar la conversación?" });
    await userEvent.click(within(dialogo).getByRole("button", { name: "Borrar" }));
  }

  it("el diálogo se cierra al confirmar y el ítem se pliega antes de salir de la lista", async () => {
    const { borrar } = pantalla();

    await borrarDeLaLista("Dólar");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(borrar).toHaveBeenCalledWith(ID_B);
    // Mientras se pliega sigue en el DOM (con la animación); cuando termina, sale.
    const item = screen.getByRole("link", { name: "Dólar" }).closest("li");
    expect(item).toHaveClass("max-h-0", "opacity-0");
    await act(async () => void (await vi.advanceTimersByTimeAsync(400)));
    expect(screen.queryByRole("link", { name: "Dólar" })).toBeNull();
    expect(screen.getByRole("link", { name: "Gastos de septiembre" })).toBeInTheDocument();
    expect(abierta()).toBe(`Abierta: ${ID_A} con 2 mensajes`); // la abierta no se toca
  });

  it("si se borra la conversación abierta, se pasa a una nueva vacía", async () => {
    pantalla();

    await borrarDeLaLista("Gastos de septiembre");
    await act(async () => void (await vi.advanceTimersByTimeAsync(400)));

    expect(screen.queryByRole("link", { name: "Gastos de septiembre" })).toBeNull();
    expect(abierta()).toMatch(/Abierta: [0-9a-f-]{36} con 0 mensajes/);
    expect(abierta()).not.toContain(ID_A);
  });

  it("si el servidor no la pudo borrar, el ítem vuelve, se avisa qué pasó y la conversación sigue abierta", async () => {
    pantalla({ borrar: vi.fn().mockRejectedValue(new Error("sin conexión")) });

    await borrarDeLaLista("Gastos de septiembre");
    await act(async () => void (await vi.advanceTimersByTimeAsync(400)));

    const item = screen.getByRole("link", { name: "Gastos de septiembre" }).closest("li");
    expect(item).toHaveClass("max-h-12", "opacity-100");
    expect(screen.getByRole("status")).toHaveTextContent(
      "No se pudo borrar «Gastos de septiembre». Revisá tu conexión y probá de nuevo."
    );
    expect(abierta()).toBe(`Abierta: ${ID_A} con 2 mensajes`);
  });

  it("cancelar el diálogo no borra nada", async () => {
    const { borrar } = pantalla();
    await userEvent.click(screen.getByRole("button", { name: "Borrar la conversación «Dólar»" }));

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(borrar).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Dólar" })).toBeInTheDocument();
  });
});

describe("TextoEscribiendose", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const sinPreferencia = () =>
    vi.stubGlobal("matchMedia", (consulta: string) => ({ matches: false, media: consulta }) as MediaQueryList);

  it("se escribe letra por letra hasta completarse", () => {
    sinPreferencia();
    const { container } = render(<TextoEscribiendose texto="Hola" msPorLetra={10} />);
    const visible = () => container.querySelector('[aria-hidden="true"]')?.textContent?.replace(/ /g, "");

    expect(visible()).toBe("");
    act(() => void vi.advanceTimersByTime(20));
    expect(visible()).toBe("Ho");
    act(() => void vi.advanceTimersByTime(100));
    expect(visible()).toBe("Hola");
  });

  it("el lector de pantalla recibe el texto completo desde el principio", () => {
    sinPreferencia();
    render(<TextoEscribiendose texto="Hola, Mateo" />);

    expect(screen.getByText("Hola, Mateo", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("con «reducir movimiento» aparece entero de una", () => {
    vi.stubGlobal("matchMedia", (consulta: string) => ({ matches: true, media: consulta }) as MediaQueryList);
    const { container } = render(<TextoEscribiendose texto="Hola, Mateo" msPorLetra={10} />);

    act(() => void vi.advanceTimersByTime(10));

    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent("Hola, Mateo");
  });
});

// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AsistenteUIMessage } from "@/shared/chat";
import BarraLateral from "@/frontend/chat/sidebar/barraLateral/BarraLateral";
import { ProveedorDelChat, useChatEnPantalla } from "@/frontend/chat/estado/ContextoDelChat";
import { ProveedorSidebar, useSidebar } from "@/frontend/chat/sidebar/EstadoSidebar";
import { esClickComun } from "@/frontend/chat/compartidos/navegacion";
import { idDeConversacionEnLaRuta, rutaDeConversacion } from "@/shared/rutas";
import TextoEscribiendose from "@/frontend/chat/conversacion/TextoEscribiendose";

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
    expect(rutaDeConversacion(ID_A)).toBe(`/conversacion/${ID_A}`);
    expect(idDeConversacionEnLaRuta(`/conversacion/${ID_A}`)).toBe(ID_A);
    expect(idDeConversacionEnLaRuta(`/conversacion/${ID_A}/`)).toBe(ID_A);
  });

  it("lo que no es la dirección de una conversación no tiene id", () => {
    expect(idDeConversacionEnLaRuta("/")).toBeNull();
    expect(idDeConversacionEnLaRuta("/conversacion/abc")).toBeNull();
    expect(idDeConversacionEnLaRuta(`/otra/${ID_A}`)).toBeNull();
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
  beforeEach(() => window.history.replaceState(null, "", rutaDeConversacion(ID_A)));

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
    expect(idDeConversacionEnLaRuta(window.location.pathname)).not.toBe(ID_A);
    expect(idDeConversacionEnLaRuta(window.location.pathname)).not.toBeNull();
    expect(leer).not.toHaveBeenCalled();
  });

  it("si la conversación abierta todavía está vacía, no crea otra: solo enfoca el campo", async () => {
    pantalla({ mensajes: [] });

    await userEvent.click(screen.getByRole("link", { name: "Nueva conversación" }));

    expect(abierta()).toBe(`Abierta: ${ID_A} con 0 mensajes`);
    expect(window.location.pathname).toBe(rutaDeConversacion(ID_A));
  });

  it("abrir una conversación de la lista trae su historial y marca esa como la actual", async () => {
    const { leer } = pantalla();

    await userEvent.click(screen.getByRole("link", { name: "Dólar" }));

    await waitFor(() => expect(abierta()).toBe(`Abierta: ${ID_B} con 1 mensajes`));
    expect(leer).toHaveBeenCalledWith(ID_B);
    expect(window.location.pathname).toBe(rutaDeConversacion(ID_B));
    expect(screen.getByRole("link", { name: "Dólar" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Gastos de septiembre" })).not.toHaveAttribute("aria-current");
  });

  it("el botón «atrás» del navegador vuelve a mostrar la conversación de la dirección", async () => {
    const { leer } = pantalla();
    await userEvent.click(screen.getByRole("link", { name: "Dólar" }));
    await waitFor(() => expect(abierta()).toContain(ID_B));
    leer.mockResolvedValueOnce(CHARLA_A);

    // El navegador cambia la dirección y avisa con «popstate» (acá se simula igual).
    window.history.replaceState(null, "", rutaDeConversacion(ID_A));
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

describe("borrar una conversación (con «Deshacer»)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", rutaDeConversacion(ID_A));
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => vi.useRealTimers());

  const tocarBorrar = (titulo: string) =>
    userEvent.click(screen.getByRole("button", { name: `Borrar la conversación «${titulo}»` }));
  /** Toca el tacho de una conversación y confirma en el diálogo. */
  async function pedirBorrar(titulo: string) {
    await tocarBorrar(titulo);
    const dialogo = screen.getByRole("dialog", { name: "¿Borrar la conversación?" });
    await userEvent.click(within(dialogo).getByRole("button", { name: "Borrar" }));
  }
  const pasar = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
  const item = (titulo: string) => screen.getByRole("link", { name: titulo }).closest("li");
  const deshacer = () => screen.queryByRole("button", { name: "Deshacer" });

  it("al cargar la página el foco no se mueve solo (regresión: iba al título «Conversaciones» y Tab salteaba la barra)", () => {
    pantalla();

    expect(document.body).toHaveFocus();
  });

  it("el tacho primero pide confirmación: mientras el diálogo está abierto no se oculta nada ni aparece el aviso", async () => {
    const { borrar } = pantalla();

    await tocarBorrar("Dólar");

    expect(screen.getByRole("dialog", { name: "¿Borrar la conversación?" })).toHaveTextContent(
      "Se va a borrar «Dólar» con todos sus mensajes. Vas a tener unos segundos para deshacerlo."
    );
    expect(item("Dólar")).not.toHaveAttribute("inert");
    expect(deshacer()).toBeNull();
    expect(borrar).not.toHaveBeenCalled();
  });

  it("cancelar el diálogo no borra nada ni muestra el aviso", async () => {
    const { borrar } = pantalla();
    await tocarBorrar("Dólar");

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await pasar(10_000);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(deshacer()).toBeNull();
    expect(item("Dólar")).toHaveClass("max-h-12", "opacity-100");
    expect(borrar).not.toHaveBeenCalled();
  });

  it("Escape también cancela el diálogo", async () => {
    const { borrar } = pantalla();
    await tocarBorrar("Dólar");

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(deshacer()).toBeNull();
    expect(borrar).not.toHaveBeenCalled();
  });

  it("al confirmar, el diálogo se cierra, el ítem se pliega fuera del teclado y aparece el aviso con el foco en «Deshacer»", async () => {
    const { borrar } = pantalla();

    await pedirBorrar("Dólar");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(item("Dólar")).toHaveClass("max-h-0", "opacity-0");
    expect(item("Dólar")).toHaveAttribute("inert");
    expect(screen.getByText("Borraste «Dólar».")).toBeInTheDocument();
    expect(deshacer()).toHaveFocus();
    expect(borrar).not.toHaveBeenCalled(); // el servidor todavía no se enteró
    expect(abierta()).toBe(`Abierta: ${ID_A} con 2 mensajes`); // la abierta no se toca
  });

  it("«Deshacer» la devuelve a la lista con el foco en su link, y nunca se borra en el servidor", async () => {
    const { borrar } = pantalla();
    await pedirBorrar("Dólar");

    await userEvent.click(deshacer()!);
    await pasar(10_000);

    expect(item("Dólar")).toHaveClass("max-h-12", "opacity-100");
    expect(item("Dólar")).not.toHaveAttribute("inert");
    expect(screen.getByRole("link", { name: "Dólar" })).toHaveFocus();
    expect(deshacer()).toBeNull();
    expect(borrar).not.toHaveBeenCalled();
  });

  it("si nadie la deshace, se borra en el servidor al cumplirse el plazo (7 s) y sale de la lista", async () => {
    const { borrar } = pantalla();
    await pedirBorrar("Dólar");

    // Margen de medio segundo a cada lado: con `shouldAdvanceTime`, el tiempo real que tardan los clicks también corre.
    await pasar(6_500);
    expect(borrar).not.toHaveBeenCalled();
    expect(deshacer()).not.toBeNull();

    await pasar(600);
    expect(borrar).toHaveBeenCalledTimes(1);
    expect(borrar).toHaveBeenCalledWith(ID_B);
    expect(deshacer()).toBeNull();
    expect(screen.queryByRole("link", { name: "Dólar" })).toBeNull();
    expect(screen.getByRole("link", { name: "Gastos de septiembre" })).toBeInTheDocument();
  });

  it("cerrar el aviso con la ✕ la borra en el momento, sin esperar el plazo, y el foco no se pierde", async () => {
    const { borrar } = pantalla();
    await pedirBorrar("Dólar");

    await userEvent.click(screen.getByRole("button", { name: "Cerrar el aviso" }));

    expect(borrar).toHaveBeenCalledWith(ID_B);
    await waitFor(() => expect(screen.queryByRole("link", { name: "Dólar" })).toBeNull());
    expect(deshacer()).toBeNull();
    expect(screen.getByRole("heading", { name: "Conversaciones" })).toHaveFocus();
  });

  it("si se borra la abierta, se pasa ya a una nueva vacía; «Deshacer» la vuelve a abrir", async () => {
    const { leer, borrar } = pantalla();
    leer.mockResolvedValue(CHARLA_A);

    await pedirBorrar("Gastos de septiembre");
    expect(abierta()).toMatch(/Abierta: [0-9a-f-]{36} con 0 mensajes/);
    expect(abierta()).not.toContain(ID_A);

    await userEvent.click(deshacer()!);

    await waitFor(() => expect(abierta()).toBe(`Abierta: ${ID_A} con 2 mensajes`));
    expect(leer).toHaveBeenCalledWith(ID_A);
    expect(borrar).not.toHaveBeenCalled();
  });

  it("deshacer una que no estaba abierta no cambia la conversación en pantalla", async () => {
    const { leer } = pantalla();
    await pedirBorrar("Dólar");

    await userEvent.click(deshacer()!);

    expect(abierta()).toBe(`Abierta: ${ID_A} con 2 mensajes`);
    expect(leer).not.toHaveBeenCalled();
  });

  it("si el servidor no la pudo borrar, el ítem vuelve y se avisa qué pasó", async () => {
    pantalla({ borrar: vi.fn().mockRejectedValue(new Error("sin conexión")) });
    await pedirBorrar("Dólar");

    await pasar(7_000);

    await waitFor(() => expect(item("Dólar")).toHaveClass("max-h-12", "opacity-100"));
    expect(item("Dólar")).not.toHaveAttribute("inert");
    expect(screen.getByText("No se pudo borrar «Dólar». Revisá tu conexión y probá de nuevo.")).toBeInTheDocument();
  });

  it("con el mouse sobre el aviso el plazo se pausa, y al salir sigue desde donde estaba", async () => {
    const { borrar } = pantalla();
    await pedirBorrar("Dólar");
    await pasar(3_000);

    await userEvent.hover(screen.getByText("Borraste «Dólar»."));
    await pasar(20_000);
    expect(borrar).not.toHaveBeenCalled();

    await userEvent.unhover(screen.getByText("Borraste «Dólar»."));
    await pasar(3_500); // quedaban 4 s de los 7
    expect(borrar).not.toHaveBeenCalled();
    await pasar(1_000);
    expect(borrar).toHaveBeenCalledWith(ID_B);
  });

  it("llegar a la ✕ con el teclado pausa el plazo (el foco que pone el aviso al aparecer, no)", async () => {
    const { borrar } = pantalla();
    await pedirBorrar("Dólar");

    await userEvent.tab(); // de «Deshacer» a la ✕
    expect(screen.getByRole("button", { name: "Cerrar el aviso" })).toHaveFocus();
    await pasar(20_000);

    expect(borrar).not.toHaveBeenCalled();
  });

  it("si se borra otra mientras hay una pendiente, la pendiente se borra en ese momento y el aviso pasa a la nueva", async () => {
    const { borrar } = pantalla();
    await pedirBorrar("Dólar");

    await pedirBorrar("Gastos de septiembre");

    expect(borrar).toHaveBeenCalledTimes(1);
    expect(borrar).toHaveBeenCalledWith(ID_B);
    expect(screen.getByText("Borraste «Gastos de septiembre».")).toBeInTheDocument();
    expect(screen.queryByText("Borraste «Dólar».")).toBeNull();
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

// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AsistenteUIMessage, EstadisticasDelPeriodo } from "@/shared/chat";
import BarraLateral from "@/frontend/chat/BarraLateral";
import CajonDelBalance from "@/frontend/chat/CajonDelBalance";
import ChatWindow from "@/frontend/chat/ChatWindow";
import { ProveedorDelChat } from "@/frontend/chat/ContextoDelChat";
import EncabezadoDeLaApp from "@/frontend/chat/EncabezadoDeLaApp";
import { ProveedorSidebar } from "@/frontend/chat/EstadoSidebar";
import { useDeslizarAlBajar } from "@/frontend/chat/hooks/useDeslizarAlBajar";
import { PanelDeDebugDelChat } from "@/frontend/chat/PanelDeDebug";

// El modo celular: el encabezado con la hamburguesa, el balance y el perfil; los cajones que se abren desde ahí; y el campo
// de texto que está en el medio mientras la conversación está vacía y baja con el primer mensaje. Componentes reales en un
// DOM (jsdom), sin layout: lo que depende del ancho de la pantalla (qué se ve en celular y qué en compu) lo resuelven las
// clases de Tailwind y se mira en el navegador; acá se prueba lo que hace cada pieza. Se reemplazan solo el router de
// Next (no existe fuera de la app), las acciones del servidor y matchMedia (jsdom no lo trae).
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

beforeEach(() => {
  vi.stubGlobal("matchMedia", (consulta: string) => ({ matches: false, media: consulta }) as MediaQueryList);
  window.history.replaceState(null, "", "/conversacion/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ID_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CHARLA: AsistenteUIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "Gasté 5000" }] },
  { id: "m2", role: "assistant", parts: [{ type: "text", text: "Anotado." }] },
];

const ESTADISTICAS: EstadisticasDelPeriodo = {
  periodo: { desde: "2026-09-01", hasta: "2026-09-30" },
  resumen: { ingresos: 1000000, gastos: 250000, balance: 750000 },
  porCategoria: [{ tipo: "gasto", categoria: "supermercado", total: 250000, porcentaje: 100 }],
  promedioDiarioDeGastos: 8333,
  variacionDeGastos: { anterior: 0, porcentaje: null },
};

/** La pantalla de chat completa (sin el servidor): encabezado, barra lateral, cajón del balance, chat y panel de debug. */
function pantalla({ mensajes = CHARLA, leer = vi.fn().mockResolvedValue(CHARLA) } = {}) {
  const cerrarSesion = vi.fn().mockResolvedValue(undefined);
  render(
    <ProveedorSidebar inicial={{ conversaciones: [{ id: ID_B, titulo: "Dólar" }] }}>
      <ProveedorDelChat
        conversacionId={ID_A}
        mensajesIniciales={mensajes}
        leerConversacion={leer}
        retitular={vi.fn().mockResolvedValue(null)}
      >
        <EncabezadoDeLaApp usuario={{ nombre: "Mateo", avatarUrl: null }} cerrarSesion={cerrarSesion} />
        <CajonDelBalance estadisticas={ESTADISTICAS} />
        <BarraLateral
          borrar={vi.fn().mockResolvedValue(undefined)}
          usuario={{ nombre: "Mateo", avatarUrl: null }}
          cerrarSesion={cerrarSesion}
        />
        <ChatWindow nombre="Mateo" />
        <PanelDeDebugDelChat />
      </ProveedorDelChat>
    </ProveedorSidebar>
  );
  return { leer, cerrarSesion };
}

describe("el encabezado", () => {
  it("tiene el único título, que lleva a una conversación nueva, con el nombre completo para el lector de pantalla", () => {
    pantalla();

    const titulo = screen.getByRole("heading", { level: 1, name: "Administrador de Finanzas" });
    expect(within(titulo).getByRole("link")).toHaveAttribute("href", "/");
  });

  it("el título en dos partes: «Administrador» y «de Finanzas» (en celular, cada una en su línea)", () => {
    pantalla();
    const titulo = screen.getByRole("heading", { level: 1 });

    expect(within(titulo).getByText("Administrador")).toHaveClass("block", "md:inline");
    expect(within(titulo).getByText("de Finanzas")).toHaveClass("block", "md:inline");
  });

  it("tocar el título abre una conversación nueva, sin recargar", async () => {
    pantalla();

    await userEvent.click(screen.getByRole("link", { name: "Administrador de Finanzas" }));

    expect(window.location.pathname).not.toBe(`/conversacion/${ID_A}`);
    expect(document.querySelector('[data-campo="al-medio"]')).not.toBeNull();
  });
});

describe("la hamburguesa (a la izquierda) abre las conversaciones", () => {
  it("es un botón con nombre que anuncia si el menú está abierto", async () => {
    pantalla();
    const hamburguesa = screen.getByRole("button", { name: "Conversaciones" });
    expect(hamburguesa).toHaveAttribute("aria-expanded", "false");
    expect(hamburguesa).toHaveAttribute("aria-controls", "barra-lateral");

    await userEvent.click(hamburguesa);

    expect(hamburguesa).toHaveAttribute("aria-expanded", "true");
    // El cajón pasa a mostrarse encima (en celular la barra está oculta hasta que se abre).
    expect(screen.getByRole("navigation", { name: "Menú principal" })).toHaveClass("fixed");
  });

  it("Escape cierra el menú y el foco vuelve a la hamburguesa", async () => {
    pantalla();
    const hamburguesa = screen.getByRole("button", { name: "Conversaciones" });
    await userEvent.click(hamburguesa);

    await userEvent.keyboard("{Escape}");

    expect(hamburguesa).toHaveAttribute("aria-expanded", "false");
    expect(hamburguesa).toHaveFocus();
  });

  it("la ✕ para cerrar va en su propia fila, separada de «Nueva conversación»", () => {
    pantalla();
    const barra = screen.getByRole("navigation", { name: "Menú principal" });
    const cerrar = within(barra).getByRole("button", { name: "Cerrar el menú" });
    const nueva = within(barra).getByRole("link", { name: "Nueva conversación" });

    expect(cerrar.parentElement).not.toBe(nueva.parentElement);
    expect(cerrar.parentElement).toHaveClass("md:hidden"); // solo en celular; en compu no hay nada que cerrar
  });

  it("elegir una conversación de la lista cierra el menú", async () => {
    pantalla();
    const hamburguesa = screen.getByRole("button", { name: "Conversaciones" });
    await userEvent.click(hamburguesa);

    await userEvent.click(
      within(screen.getByRole("navigation", { name: "Menú principal" })).getByRole("link", { name: "Dólar" })
    );

    await waitFor(() => expect(hamburguesa).toHaveAttribute("aria-expanded", "false"));
  });
});

describe("el botón del balance (a la derecha) abre el balance del mes", () => {
  it("abre el cajón con el resumen del mes y el botón anuncia que está abierto", async () => {
    pantalla();
    const boton = screen.getByRole("button", { name: "Balance del mes" });
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("complementary", { name: "Este mes" })).toBeNull();

    await userEvent.click(boton);

    const cajon = screen.getByRole("complementary", { name: "Este mes" });
    expect(boton).toHaveAttribute("aria-expanded", "true");
    expect(cajon).toHaveTextContent("septiembre de 2026");
    expect(cajon).toHaveTextContent(/Balance\s*\$\s750\.000/);
  });

  it("el foco va al botón de cerrar; la ✕ lo cierra y el foco vuelve al botón del encabezado", async () => {
    pantalla();
    const boton = screen.getByRole("button", { name: "Balance del mes" });
    await userEvent.click(boton);
    const cerrar = screen.getByRole("button", { name: "Cerrar el balance del mes" });
    expect(cerrar).toHaveFocus();

    await userEvent.click(cerrar);

    expect(screen.queryByRole("complementary", { name: "Este mes" })).toBeNull();
    expect(boton).toHaveFocus();
  });

  it("Escape también lo cierra", async () => {
    pantalla();
    await userEvent.click(screen.getByRole("button", { name: "Balance del mes" }));

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("complementary", { name: "Este mes" })).toBeNull();
  });
});

describe("la foto del perfil (en la esquina) abre su menú", () => {
  it("en el encabezado es solo la foto (con su nombre accesible) y abre «Panel de debug» y «Cerrar sesión»", async () => {
    pantalla();
    const [delEncabezado] = screen.getAllByRole("button", { name: "Cuenta de Mateo" });

    await userEvent.click(delEncabezado!);

    const menu = screen.getByRole("menu", { name: "Cuenta de Mateo" });
    expect(within(menu).getByRole("menuitem", { name: "Panel de debug" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Cerrar sesión" })).toBeInTheDocument();
    expect(delEncabezado).not.toHaveTextContent("Mateo"); // solo la inicial, no el nombre
  });

  it("«Panel de debug» desde el encabezado abre el panel", async () => {
    pantalla();
    await userEvent.click(screen.getAllByRole("button", { name: "Cuenta de Mateo" })[0]!);

    await userEvent.click(screen.getByRole("menuitem", { name: "Panel de debug" }));

    expect(screen.getByRole("complementary", { name: "Panel de debug" })).toBeInTheDocument();
  });

  it("«Cerrar sesión» desde el encabezado pregunta antes y recién al confirmar cierra", async () => {
    const { cerrarSesion } = pantalla();
    await userEvent.click(screen.getAllByRole("button", { name: "Cuenta de Mateo" })[0]!);
    await userEvent.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));
    const dialogo = screen.getByRole("dialog", { name: "¿Cerrar sesión?" });
    expect(cerrarSesion).not.toHaveBeenCalled();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(cerrarSesion).toHaveBeenCalledOnce());
  });

  it("en la barra lateral el perfil sigue estando, pero solo para tablet y compu (en celular está en la esquina)", () => {
    pantalla();
    const barra = screen.getByRole("navigation", { name: "Menú principal" });
    const delPerfil = within(barra).getByRole("button", { name: "Cuenta de Mateo" });

    expect(delPerfil.closest("div.hidden")).toHaveClass("md:block");
    expect(delPerfil).toHaveTextContent("Mateo"); // acá sí con el nombre
  });
});

describe("el campo de texto: al medio con la conversación vacía, abajo con mensajes", () => {
  it("una conversación vacía tiene el saludo y el campo juntos en el medio", () => {
    pantalla({ mensajes: [] });

    expect(document.querySelector('[data-campo="al-medio"]')).not.toBeNull();
    expect(screen.getByText("Hola, Mateo. ¿Qué querés hacer?", { selector: ".sr-only" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tu mensaje" })).toBeInTheDocument();
  });

  it("el campo queda pegado abajo mientras los mensajes pasan por debajo; vacía, va junto al saludo sin pegarse", () => {
    const { unmount } = render(<></>);
    unmount();
    pantalla();
    expect(screen.getByRole("textbox", { name: "Tu mensaje" }).closest(".sticky")).toHaveClass("bottom-0", "z-10");
    cleanup();

    pantalla({ mensajes: [] });
    expect(screen.getByRole("textbox", { name: "Tu mensaje" }).closest(".sticky")).toBeNull();
  });

  it("con mensajes, el campo va abajo del todo y no hay saludo", () => {
    pantalla();

    expect(document.querySelector('[data-campo="abajo"]')).not.toBeNull();
    expect(screen.queryByText(/Hola, Mateo/)).toBeNull();
  });

  it("al abrir una conversación guardada baja, y al crear una nueva vuelve al medio: siempre el mismo campo", async () => {
    pantalla({ mensajes: [] });
    const campo = screen.getByRole("textbox", { name: "Tu mensaje" });

    await userEvent.click(
      within(screen.getByRole("navigation", { name: "Menú principal" })).getByRole("link", { name: "Dólar" })
    );
    await waitFor(() => expect(document.querySelector('[data-campo="abajo"]')).not.toBeNull());
    expect(screen.getByRole("textbox", { name: "Tu mensaje" })).toBe(campo); // no se volvió a crear: conserva el foco y el texto

    await userEvent.click(screen.getByRole("link", { name: "Administrador de Finanzas" }));
    expect(document.querySelector('[data-campo="al-medio"]')).not.toBeNull();
    expect(screen.getByRole("textbox", { name: "Tu mensaje" })).toBe(campo);
  });
});

describe("useDeslizarAlBajar", () => {
  /** Un elemento que pasa del medio a abajo (o al revés) y cambia de lugar. `tops` es donde está en cada render. */
  function Prueba({ centrado, contexto = "a" }: { centrado: boolean; contexto?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useDeslizarAlBajar(ref, centrado, contexto);
    return <div ref={ref}>campo</div>;
  }

  const animar = vi.fn();
  let top = 300;
  beforeEach(() => {
    animar.mockClear();
    Object.defineProperty(HTMLElement.prototype, "animate", { value: animar, configurable: true });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ top }) as DOMRect);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error: se saca el `animate` que se puso para el test.
    delete HTMLElement.prototype.animate;
  });

  it("al pasar del medio a abajo, arranca donde estaba y se desliza hasta donde quedó", () => {
    top = 300; // en el medio
    const { rerender } = render(<Prueba centrado />);

    top = 620; // abajo del todo
    rerender(<Prueba centrado={false} />);

    expect(animar).toHaveBeenCalledOnce();
    expect(animar.mock.calls[0]![0]).toEqual([{ transform: "translateY(-320px)" }, { transform: "translateY(0)" }]);
  });

  it("no se anima si al cambiar de conversación el campo cambia de lugar: solo cambia", () => {
    top = 300;
    const { rerender } = render(<Prueba centrado contexto="a" />);

    top = 620;
    rerender(<Prueba centrado={false} contexto="b" />);

    expect(animar).not.toHaveBeenCalled();
  });

  it("no se anima cuando sube (de abajo al medio): solo al bajar", () => {
    top = 620;
    const { rerender } = render(<Prueba centrado={false} />);

    top = 300;
    rerender(<Prueba centrado />);

    expect(animar).not.toHaveBeenCalled();
  });

  it("no se anima si casi no se movió", () => {
    top = 300;
    const { rerender } = render(<Prueba centrado />);

    top = 300.5;
    rerender(<Prueba centrado={false} />);

    expect(animar).not.toHaveBeenCalled();
  });

  it("con «reducir movimiento» activado salta directo", () => {
    vi.stubGlobal("matchMedia", (consulta: string) => ({ matches: true, media: consulta }) as MediaQueryList);
    top = 300;
    const { rerender } = render(<Prueba centrado />);

    top = 620;
    rerender(<Prueba centrado={false} />);

    expect(animar).not.toHaveBeenCalled();
  });
});

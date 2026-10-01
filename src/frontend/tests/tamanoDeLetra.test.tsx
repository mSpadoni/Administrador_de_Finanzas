// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PerfilDeUsuario from "@/frontend/chat/sidebar/PerfilDeUsuario";
import { SCRIPT_DEL_TAMANO_DE_LETRA, tamanoDeLetraActual } from "@/frontend/compartidos/tamanoDeLetra";

// El tamaño de letra (accesibilidad): se elige en el menú de la cuenta, se aplica a toda la página con
// `<html data-letra="...">` y se recuerda en el navegador. El tamaño en sí (112,5 % y 125 %) lo pone el CSS: que la
// letra crezca de verdad se prueba en el E2E, con un navegador real.

const CLAVE = "tamano-de-letra";
const raiz = () => document.documentElement;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  delete raiz().dataset.letra;
});

/** Corre el script del <head> como lo hace el navegador al cargar la página. */
const correrElScriptDelHead = () => new Function(SCRIPT_DEL_TAMANO_DE_LETRA)();

describe("el script que aplica el tamaño guardado antes de dibujar la página", () => {
  it.each(["grande", "muy-grande"])("con «%s» guardado, lo aplica", (guardado) => {
    localStorage.setItem(CLAVE, guardado);

    correrElScriptDelHead();

    expect(raiz().dataset.letra).toBe(guardado);
  });

  it.each([
    ["normal (el tamaño de siempre)", "normal"],
    ["un valor que no existe", "gigante"],
    ["un valor vacío", ""],
  ])("con %s guardado, deja la letra normal", (_caso, guardado) => {
    localStorage.setItem(CLAVE, guardado);

    correrElScriptDelHead();

    expect(raiz().dataset.letra).toBeUndefined();
  });

  it("sin nada guardado, deja la letra normal", () => {
    correrElScriptDelHead();

    expect(raiz().dataset.letra).toBeUndefined();
  });

  it("si el navegador no deja leer localStorage, no rompe la página y deja la letra normal", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(correrElScriptDelHead).not.toThrow();
    expect(raiz().dataset.letra).toBeUndefined();
  });
});

describe("tamanoDeLetraActual", () => {
  it("si alguien puso un valor que no existe en la página, lo toma como normal", () => {
    raiz().dataset.letra = "enorme";

    expect(tamanoDeLetraActual()).toBe("normal");
  });
});

describe("el menú de la cuenta — tamaño de letra", () => {
  const perfil = (props: Partial<Parameters<typeof PerfilDeUsuario>[0]> = {}) => (
    <PerfilDeUsuario nombre="Mateo" avatarUrl={null} cerrarSesion={vi.fn()} onAbrirDebug={vi.fn()} {...props} />
  );

  async function abrirMenu() {
    await userEvent.click(screen.getByRole("button", { name: "Cuenta de Mateo" }));
    return within(screen.getByRole("group", { name: "Tamaño de letra" }));
  }

  it("ofrece Normal, Grande y Muy grande, con Normal elegido de entrada", async () => {
    render(perfil());
    const grupo = await abrirMenu();

    const opciones = grupo.getAllByRole("menuitemradio");
    expect(opciones).toHaveLength(3);
    expect(opciones[0]).toHaveAccessibleName("Normal");
    expect(opciones[1]).toHaveAccessibleName("Grande");
    expect(opciones[2]).toHaveAccessibleName("Muy grande");
    expect(grupo.getByRole("menuitemradio", { name: "Normal" })).toHaveAttribute("aria-checked", "true");
    expect(grupo.getByRole("menuitemradio", { name: "Grande" })).toHaveAttribute("aria-checked", "false");
  });

  it("elegir «Grande» agranda la página, lo recuerda y deja el menú abierto para ver el cambio", async () => {
    render(perfil());
    const grupo = await abrirMenu();

    await userEvent.click(grupo.getByRole("menuitemradio", { name: "Grande" }));

    expect(raiz().dataset.letra).toBe("grande");
    expect(localStorage.getItem(CLAVE)).toBe("grande");
    expect(grupo.getByRole("menuitemradio", { name: "Grande" })).toHaveAttribute("aria-checked", "true");
    expect(grupo.getByRole("menuitemradio", { name: "Normal" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("volver a «Normal» quita el tamaño de la página y lo que estaba guardado", async () => {
    render(perfil());
    const grupo = await abrirMenu();
    await userEvent.click(grupo.getByRole("menuitemradio", { name: "Muy grande" }));

    await userEvent.click(grupo.getByRole("menuitemradio", { name: "Normal" }));

    expect(raiz().dataset.letra).toBeUndefined();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it("se elige con el teclado: las flechas llegan a las opciones y Enter elige", async () => {
    render(perfil());
    await abrirMenu();

    // Panel de debug → Cerrar sesión → Normal → Grande → Muy grande.
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("menuitemradio", { name: "Muy grande" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    expect(raiz().dataset.letra).toBe("muy-grande");
  });

  it("el menú de la barra y el del encabezado muestran la misma elección", async () => {
    render(
      <>
        {perfil()}
        {perfil({ nombre: "Otra", variante: "encabezado" })}
      </>
    );
    const grupo = await abrirMenu();
    await userEvent.click(grupo.getByRole("menuitemradio", { name: "Grande" }));
    await userEvent.keyboard("{Escape}");

    await userEvent.click(screen.getByRole("button", { name: "Cuenta de Otra" }));

    expect(screen.getByRole("menuitemradio", { name: "Grande" })).toHaveAttribute("aria-checked", "true");
  });

  it("si el navegador no deja guardar, el tamaño se aplica igual (solo que no se recuerda)", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    render(perfil());
    const grupo = await abrirMenu();

    await userEvent.click(grupo.getByRole("menuitemradio", { name: "Grande" }));

    expect(raiz().dataset.letra).toBe("grande");
  });
});

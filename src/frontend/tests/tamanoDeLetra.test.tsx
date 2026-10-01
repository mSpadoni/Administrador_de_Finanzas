// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PerfilDeUsuario from "@/frontend/chat/sidebar/PerfilDeUsuario";
import { SCRIPT_DEL_TAMANO_DE_LETRA, tamanoDeLetraActual } from "@/frontend/compartidos/tamanoDeLetra";

// El tamaño de letra (accesibilidad): una barra de 85 % a 130 % (de a 5 %) en una ventanita que se abre desde el menú
// de la cuenta. Cambia la letra base de <html> y se recuerda en el navegador. Que la letra crezca de verdad en pantalla
// (y que la barra se mueva con las flechas, que jsdom no simula) se prueba en el E2E, con un navegador real.

const CLAVE = "tamano-de-letra";
const letraDeLaPagina = () => document.documentElement.style.fontSize;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.style.fontSize = "";
});

/** Corre el script del <head> como lo hace el navegador al cargar la página. */
const correrElScriptDelHead = () => new Function(SCRIPT_DEL_TAMANO_DE_LETRA)();

describe("el script que aplica el tamaño guardado antes de dibujar la página", () => {
  it.each([
    ["85", "85%"], // el mínimo
    ["90", "90%"],
    ["125", "125%"],
    ["130", "130%"], // el máximo
  ])("con %s guardado, pone la letra en %s", (guardado, esperado) => {
    localStorage.setItem(CLAVE, guardado);

    correrElScriptDelHead();

    expect(letraDeLaPagina()).toBe(esperado);
  });

  it.each([
    ["100 (el normal: no hace falta tocar nada)", "100"],
    ["80 (por debajo del mínimo)", "80"],
    ["135 (por encima del máximo)", "135"],
    ["150 (el máximo de la versión anterior)", "150"],
    ["112 (no es un paso de 5)", "112"],
    ["«grande» (lo que guardaba la versión anterior)", "grande"],
    ["un valor vacío", ""],
  ])("con %s guardado, deja la letra normal", (_caso, guardado) => {
    localStorage.setItem(CLAVE, guardado);

    correrElScriptDelHead();

    expect(letraDeLaPagina()).toBe("");
  });

  it("sin nada guardado, deja la letra normal", () => {
    correrElScriptDelHead();

    expect(letraDeLaPagina()).toBe("");
  });

  it("si el navegador no deja leer localStorage, no rompe la página y deja la letra normal", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(correrElScriptDelHead).not.toThrow();
    expect(letraDeLaPagina()).toBe("");
  });
});

describe("tamanoDeLetraActual", () => {
  it("si la página tiene un tamaño que no es válido, lo toma como el normal", () => {
    document.documentElement.style.fontSize = "300%";

    expect(tamanoDeLetraActual()).toBe(100);
  });
});

describe("la ventanita del tamaño de letra", () => {
  async function abrirLaVentanita() {
    render(<PerfilDeUsuario nombre="Mateo" avatarUrl={null} cerrarSesion={vi.fn()} onAbrirDebug={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Cuenta de Mateo" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Tamaño de letra…" }));
    return screen.getByRole("dialog", { name: "Tamaño de letra" });
  }

  const barra = () => screen.getByRole("slider", { name: "Tamaño de letra" });

  it("se abre desde el menú de la cuenta con la barra enfocada, en el 100 %, de 85 % a 130 %", async () => {
    await abrirLaVentanita();

    expect(barra()).toHaveFocus();
    expect(barra()).toHaveValue("100");
    expect(barra()).toHaveAttribute("min", "85");
    expect(barra()).toHaveAttribute("max", "130");
    expect(barra()).toHaveAttribute("aria-valuetext", "100 %");
    expect(screen.getByRole("button", { name: "Restablecer" })).toBeDisabled();
  });

  it("mover la barra cambia la letra de toda la página enseguida y la guarda", async () => {
    await abrirLaVentanita();

    fireEvent.change(barra(), { target: { value: "125" } });

    expect(letraDeLaPagina()).toBe("125%");
    expect(localStorage.getItem(CLAVE)).toBe("125");
    expect(barra()).toHaveAttribute("aria-valuetext", "125 %");
  });

  it("también se puede achicar", async () => {
    await abrirLaVentanita();

    fireEvent.change(barra(), { target: { value: "85" } });

    expect(letraDeLaPagina()).toBe("85%");
    expect(localStorage.getItem(CLAVE)).toBe("85");
  });

  it("«Restablecer» vuelve al 100 % y borra lo guardado", async () => {
    await abrirLaVentanita();
    fireEvent.change(barra(), { target: { value: "120" } });

    await userEvent.click(screen.getByRole("button", { name: "Restablecer" }));

    expect(letraDeLaPagina()).toBe("");
    expect(localStorage.getItem(CLAVE)).toBeNull();
    expect(barra()).toHaveValue("100");
  });

  it("«Listo» la cierra, deja lo elegido y el foco vuelve al botón de la cuenta", async () => {
    await abrirLaVentanita();
    fireEvent.change(barra(), { target: { value: "110" } });

    await userEvent.click(screen.getByRole("button", { name: "Listo" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(letraDeLaPagina()).toBe("110%");
    expect(screen.getByRole("button", { name: "Cuenta de Mateo" })).toHaveFocus();
  });

  it("Escape la cierra", async () => {
    await abrirLaVentanita();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Tab no sale de la ventanita: de «Listo» vuelve a la barra", async () => {
    await abrirLaVentanita();
    fireEvent.change(barra(), { target: { value: "110" } });

    await userEvent.tab(); // Restablecer
    await userEvent.tab(); // Listo
    await userEvent.tab(); // vuelve a la barra

    expect(barra()).toHaveFocus();
  });

  it("si el navegador no deja guardar, el tamaño se aplica igual (solo que no se recuerda)", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    await abrirLaVentanita();

    fireEvent.change(barra(), { target: { value: "130" } });

    expect(letraDeLaPagina()).toBe("130%");
  });
});

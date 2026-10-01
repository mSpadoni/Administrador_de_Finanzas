// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BienvenidaConLogin from "@/frontend/autenticacion/BienvenidaConLogin";

// La pantalla que ve quien no tiene sesión: qué hace la app, el botón de Google y el aviso si falló el login.
afterEach(cleanup);

describe("BienvenidaConLogin", () => {
  it("presenta la app y ofrece ingresar con Google", () => {
    render(<BienvenidaConLogin ingresar={vi.fn()} falloElLogin={false} />);

    expect(screen.getByRole("heading", { level: 1, name: "Administrador de Finanzas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ingresar con Google" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("si falló el login lo dice (se anuncia solo) y sigue ofreciendo ingresar", () => {
    render(<BienvenidaConLogin ingresar={vi.fn()} falloElLogin />);

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos iniciar tu sesión.");
    expect(screen.getByRole("button", { name: "Ingresar con Google" })).toBeInTheDocument();
  });
});

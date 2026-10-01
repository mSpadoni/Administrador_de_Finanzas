// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSeguirAlFinal } from "@/frontend/chat/estado/hooks/useSeguirAlFinal";

// El scroll que acompaña a la conversación: baja solo cuando llega un mensaje o cambia el alto del contenido, salvo que la
// persona haya subido a leer. jsdom no tiene layout, así que el alto del contenido y la posición del scroll se simulan en el
// elemento (las mismas propiedades que lee y escribe el hook). Con «reducir movimiento» el hook salta directo al final: se
// prueba qué decide, no la animación cuadro a cuadro.

/** Un observador de tamaño de mentira que guarda la función para dispararla cuando el test quiere. */
let avisarCambioDeTamano: () => void = () => undefined;
class ObservadorDeTamano {
  constructor(alCambiar: () => void) {
    avisarCambioDeTamano = alCambiar;
  }
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (consulta: string) => ({ matches: true, media: consulta }) as MediaQueryList);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Props = { mensajes: number };
let volver: () => void = () => undefined;

function Zona({ mensajes }: Props) {
  const { zonaRef, alScrollear, volverAlFinal } = useSeguirAlFinal(mensajes, "ready");
  volver = volverAlFinal;
  return (
    <div ref={zonaRef} onScroll={(evento) => alScrollear(evento.currentTarget)} data-testid="zona">
      <div>contenido</div>
    </div>
  );
}

/** Prepara la zona con un alto de contenido, un alto visible y una posición de scroll que se pueden cambiar a mano. */
function prepararZona(alturaDelContenido: number, alturaVisible = 400) {
  const zona = screen.getByTestId("zona");
  const estado = { scrollTop: 0, scrollHeight: alturaDelContenido };
  Object.defineProperty(zona, "scrollTop", {
    configurable: true,
    get: () => estado.scrollTop,
    // Como hace el navegador: nunca más allá del final.
    set: (valor: number) => (estado.scrollTop = Math.max(0, Math.min(valor, estado.scrollHeight - alturaVisible))),
  });
  Object.defineProperty(zona, "scrollHeight", { configurable: true, get: () => estado.scrollHeight });
  Object.defineProperty(zona, "clientHeight", { configurable: true, get: () => alturaVisible });
  return {
    zona,
    estado,
    /** La persona scrollea hasta `posicion` (y el navegador avisa con un evento de scroll). */
    scrollearA(posicion: number) {
      estado.scrollTop = posicion;
      act(() => void zona.dispatchEvent(new Event("scroll")));
    },
    /** El contenido cambia de alto; el navegador ajusta el scroll si quedó más allá del final y avisa. */
    cambiarAlturaA(altura: number) {
      estado.scrollHeight = altura;
      estado.scrollTop = Math.min(estado.scrollTop, altura - alturaVisible);
      act(() => void zona.dispatchEvent(new Event("scroll")));
    },
  };
}

describe("useSeguirAlFinal", () => {
  it("al llegar un mensaje, mientras se mira el final, el scroll baja al final", () => {
    const { rerender } = render(<Zona mensajes={1} />);
    const { estado } = prepararZona(1000);

    estado.scrollHeight = 1400; // el contenido creció con el mensaje nuevo
    rerender(<Zona mensajes={2} />);

    expect(estado.scrollTop).toBe(1400 - 400);
  });

  it("si la persona subió a leer, un mensaje nuevo no la mueve", () => {
    const { rerender } = render(<Zona mensajes={1} />);
    const { estado, scrollearA } = prepararZona(1000);
    scrollearA(600); // al final
    scrollearA(100); // sube a leer

    estado.scrollHeight = 1400;
    rerender(<Zona mensajes={2} />);

    expect(estado.scrollTop).toBe(100);
  });

  it("si el contenido se achica y el navegador baja el scroll solo, no cuenta como subir: sigue acompañando", () => {
    const { rerender } = render(<Zona mensajes={1} />);
    const { estado, scrollearA, cambiarAlturaA } = prepararZona(2000);
    scrollearA(1600); // mirando el final

    cambiarAlturaA(800); // se abre una conversación más corta: el scroll se corrige solo (1600 → 400)
    expect(estado.scrollTop).toBe(400);
    estado.scrollHeight = 1200; // llega un mensaje en la conversación nueva
    rerender(<Zona mensajes={2} />);

    expect(estado.scrollTop).toBe(1200 - 400);
  });

  it("volverAlFinal retoma el seguimiento (al mandar un mensaje o abrir otra conversación)", () => {
    const { rerender } = render(<Zona mensajes={1} />);
    const { estado, scrollearA } = prepararZona(1000);
    scrollearA(600);
    scrollearA(100); // la persona había subido

    volver();
    estado.scrollHeight = 1400;
    rerender(<Zona mensajes={2} />);

    expect(estado.scrollTop).toBe(1400 - 400);
  });

  it("si la persona vuelve a bajar hasta el final, el seguimiento se retoma solo", () => {
    const { rerender } = render(<Zona mensajes={1} />);
    const { estado, scrollearA } = prepararZona(1000);
    scrollearA(600);
    scrollearA(100); // sube
    scrollearA(590); // vuelve a bajar, casi hasta el final

    estado.scrollHeight = 1400;
    rerender(<Zona mensajes={2} />);

    expect(estado.scrollTop).toBe(1400 - 400);
  });

  describe("cuando cambia el alto del contenido sin que llegue un mensaje (el campo que crece, una tarjeta que se dibuja)", () => {
    beforeEach(() => vi.stubGlobal("ResizeObserver", ObservadorDeTamano));

    it("sigue pegado al final", () => {
      render(<Zona mensajes={1} />);
      const { estado, scrollearA } = prepararZona(1000);
      scrollearA(600); // mirando el final

      estado.scrollHeight = 1160; // el campo de texto creció 160 px
      act(() => avisarCambioDeTamano());

      expect(estado.scrollTop).toBe(1160 - 400);
    });

    it("no mueve a la persona que subió a leer", () => {
      render(<Zona mensajes={1} />);
      const { estado, scrollearA } = prepararZona(1000);
      scrollearA(600);
      scrollearA(100);

      estado.scrollHeight = 1160;
      act(() => avisarCambioDeTamano());

      expect(estado.scrollTop).toBe(100);
    });
  });
});

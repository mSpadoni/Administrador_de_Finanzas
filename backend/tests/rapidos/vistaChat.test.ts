import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { textoDe, type AsistenteUIMessage } from "@/shared/chat";
import { tituloDesde } from "@/shared/conversaciones";
import { anuncioDeRespuesta, ATAJOS, atajoEstaCompleto, tituloDeLaConversacion } from "@/views/chat/respuesta";
import { errorParaMostrar, estaCercaDelFinal, siguienteScroll } from "@/views/chat/tipos";

// Sin mocks: errores reales como los que arma useChat (Error con el cuerpo de la respuesta o el texto del stream).

describe("errorParaMostrar (qué error ve el usuario y con qué código)", () => {
  it("lo que manda el servidor ({ error: { codigo, mensaje } }, en la respuesta o en el stream) se usa tal cual", () => {
    const cuerpo = { error: { codigo: "no_autenticado", mensaje: "Tu sesión expiró." } };

    expect(errorParaMostrar(new Error(JSON.stringify(cuerpo)))).toEqual(cuerpo.error);
  });

  it("un error de red, uno desconocido o ninguno es «sin_conexion», sin mostrar el texto crudo", () => {
    for (const error of [new TypeError("Failed to fetch"), new Error("stack interno"), undefined]) {
      expect(errorParaMostrar(error)).toMatchObject({
        codigo: "sin_conexion",
        mensaje: expect.stringContaining("Revisá tu conexión"),
      });
    }
  });
});

describe("estaCercaDelFinal (si el chat acompaña la respuesta o deja al usuario leyendo)", () => {
  // Una zona de 500 px de alto con 2000 px de contenido: el final está en scrollTop = 1500.
  const zona = (scrollTop: number) => ({ scrollTop, scrollHeight: 2000, clientHeight: 500 });

  it("en el final, o casi (menos de 80 px), está pegado al final", () => {
    expect(estaCercaDelFinal(zona(1500))).toBe(true);
    expect(estaCercaDelFinal(zona(1430))).toBe(true);
  });

  it("si subió a leer algo, no está en el final (no hay que moverlo)", () => {
    expect(estaCercaDelFinal(zona(1000))).toBe(false);
    expect(estaCercaDelFinal(zona(0))).toBe(false);
  });

  it("si el contenido entra entero en la pantalla, está en el final", () => {
    expect(estaCercaDelFinal({ scrollTop: 0, scrollHeight: 300, clientHeight: 500 })).toBe(true);
  });
});

describe("siguienteScroll (la pantalla se desliza hacia el final, sin saltos)", () => {
  it("avanza solo una parte de lo que falta: lejos va más rápido, cerca más despacio", () => {
    const lejos = siguienteScroll(0, 1000) - 0;
    const cerca = siguienteScroll(900, 1000) - 900;

    expect(lejos).toBeGreaterThan(cerca);
    expect(lejos).toBeLessThan(1000); // no salta directo al final
  });

  it("siempre llega: avanza al menos 1 px y, a 1 px o menos, se queda en el final", () => {
    expect(siguienteScroll(995, 1000)).toBeGreaterThanOrEqual(996);
    expect(siguienteScroll(999.5, 1000)).toBe(1000);
    // Repitiendo pasos se llega al final en una cantidad razonable de cuadros (menos de 2 segundos a 60 fps).
    let posicion = 0;
    let cuadros = 0;
    while (posicion < 1000 && cuadros < 500) {
      posicion = siguienteScroll(posicion, 1000);
      cuadros++;
    }
    expect(posicion).toBe(1000);
    expect(cuadros).toBeLessThan(120);
  });

  it("si ya está en el final (o más abajo), no se mueve", () => {
    expect(siguienteScroll(1000, 1000)).toBe(1000);
    expect(siguienteScroll(1200, 1000)).toBe(1000);
  });
});

describe("al terminar una respuesta (respuesta.ts)", () => {
  const mensaje = (role: "user" | "assistant", ...textos: string[]): AsistenteUIMessage => ({
    id: randomUUID(),
    role,
    parts: textos.map((text) => ({ type: "text" as const, text })),
  });

  it("textoDe junta solo las partes de texto", () => {
    const conTool: AsistenteUIMessage = {
      id: "m",
      role: "assistant",
      parts: [
        { type: "text", text: "Mirá" },
        {
          type: "tool-cotizacion_dolar",
          toolCallId: "t",
          state: "output-available",
          input: { tipoDeDolar: "blue" },
          output: {
            ok: true,
            cotizaciones: [{ tipoDeDolar: "blue", compra: 1540, venta: 1560, actualizada: "2026-09-29T17:00:00.000Z" }],
          },
        },
        { type: "text", text: "esto" },
      ],
    };

    expect(textoDe(conTool)).toBe("Mirá esto");
    expect(textoDe(conTool, "\n\n")).toBe("Mirá\n\nesto");
  });

  it("el lector de pantalla lee la respuesta entera", () => {
    expect(anuncioDeRespuesta(mensaje("assistant", "Hola,", "¿qué hacemos?"))).toBe(
      "El asistente respondió: Hola, ¿qué hacemos?"
    );
  });

  it("el título del sidebar sale del primer mensaje del usuario, igual que en el servidor", () => {
    const mensajes = [mensaje("user", "Gasté 5000 en el súper"), mensaje("assistant", "Dale"), mensaje("user", "Otro")];

    expect(tituloDeLaConversacion(mensajes)).toBe(tituloDesde("Gasté 5000 en el súper"));
    expect(tituloDeLaConversacion([])).toBe("Conversación nueva");
  });

  it("los atajos completos se mandan directo; los que terminan en «:» esperan que el usuario complete", () => {
    expect(ATAJOS.map((atajo) => atajoEstaCompleto(atajo.mensaje))).toEqual([true, false, false, false]);
  });
});

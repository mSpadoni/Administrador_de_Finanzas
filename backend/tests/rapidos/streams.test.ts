import type { UIMessageChunk } from "ai";
import { describe, expect, it } from "vitest";
import { timeoutComoError } from "@/backend/asistente/streams";
import { leerErrorPublico } from "@/shared/erroresShared";

// Cómo viaja por el stream del chat el corte por tiempo: el SDK corta con un "abort" y la persona tiene que ver un error
// con su código. Con un stream real, sin mocks.

describe("timeoutComoError (el corte por timeout llega al usuario como error con código)", () => {
  /** Pasa los eventos por el paso real, con un stream real, y devuelve lo que sale. */
  async function pasarPor(eventos: UIMessageChunk[]): Promise<UIMessageChunk[]> {
    const salida: UIMessageChunk[] = [];
    const stream = new ReadableStream<UIMessageChunk>({
      start(controlador) {
        eventos.forEach((evento) => controlador.enqueue(evento));
        controlador.close();
      },
    }).pipeThrough(timeoutComoError());
    const lector = stream.getReader();
    for (let leido = await lector.read(); !leido.done; leido = await lector.read()) salida.push(leido.value);
    return salida;
  }

  it("un abort por TimeoutError se convierte en un error que el navegador lee con su código", async () => {
    const [evento] = await pasarPor([{ type: "abort", reason: "TimeoutError: Step timeout exceeded" }]);

    expect(evento.type).toBe("error");
    expect(evento.type === "error" && leerErrorPublico(evento.errorText)).toEqual({
      codigo: "asistente_demorado",
      mensaje: "El asistente tardó demasiado en responder. Probá de nuevo en unos segundos.",
    });
  });

  it("el resto de los eventos (texto, un abort del usuario) pasan igual", async () => {
    const eventos: UIMessageChunk[] = [
      { type: "text-delta", id: "1", delta: "Hola" },
      { type: "abort", reason: "AbortError" },
    ];

    expect(await pasarPor(eventos)).toEqual(eventos);
  });
});

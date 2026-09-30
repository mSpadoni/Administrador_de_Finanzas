import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { textoDe, type AsistenteUIMessage } from "@/shared/chat";
import { tituloDesde } from "@/shared/conversaciones";
import {
  anuncioDeRespuesta,
  ATAJOS,
  estadoDeLaRespuesta,
  mensajeListoParaMostrar,
  TEXTO_PENSANDO,
  tituloDeLaConversacion,
} from "@/frontend/chat/respuesta";
import { TEXTOS_DE_HERRAMIENTAS } from "@/frontend/chat/tipos";
import { errorParaMostrar, estaCercaDelFinal, siguienteScroll } from "@/frontend/chat/tipos";

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

  it("los atajos son consultas que se ejecutan directo: ninguno termina esperando que la persona complete un dato", () => {
    expect(ATAJOS.map((atajo) => atajo.id)).toEqual(["resumen-del-mes", "gastos-por-categoria", "cotizacion-del-dolar"]);
    for (const atajo of ATAJOS) expect(atajo.mensaje.trimEnd()).not.toMatch(/:$/);
  });

  it("cada atajo tiene su propio id y título, y no son más de 7 (ley de Hick)", () => {
    expect(new Set(ATAJOS.map((atajo) => atajo.id)).size).toBe(ATAJOS.length);
    expect(new Set(ATAJOS.map((atajo) => atajo.titulo)).size).toBe(ATAJOS.length);
    expect(ATAJOS.length).toBeLessThanOrEqual(7);
  });
});

describe("estadoDeLaRespuesta (qué está haciendo el asistente ahora)", () => {
  /** Un mensaje del asistente con las partes dadas (las tools en el estado que se quiera probar). */
  const delAsistente = (...partes: unknown[]) => ({ id: "a", role: "assistant", parts: partes }) as AsistenteUIMessage;
  const usuario: AsistenteUIMessage = { id: "u", role: "user", parts: [{ type: "text", text: "Hola" }] };
  const tool = (state: string) => ({ type: "tool-consultar_movimientos", toolCallId: "t", state, input: {} });
  const usando = TEXTOS_DE_HERRAMIENTAS.consultar_movimientos.usando;

  it("recién mandado el mensaje, piensa", () => {
    expect(estadoDeLaRespuesta("submitted", [usuario])).toBe(TEXTO_PENSANDO);
  });

  it("sin nada para mostrar cuando no hay respuesta en curso", () => {
    expect(estadoDeLaRespuesta("ready", [usuario])).toBeNull();
    expect(estadoDeLaRespuesta("error", [usuario])).toBeNull();
  });

  it("mientras una tool trabaja, dice qué hace con las palabras de esa tool", () => {
    expect(estadoDeLaRespuesta("streaming", [usuario, delAsistente(tool("input-available"))])).toBe(usando);
    expect(estadoDeLaRespuesta("streaming", [usuario, delAsistente(tool("input-streaming"))])).toBe(usando);
  });

  it("una tool que ya terminó no cuenta: hasta que llega el texto, el asistente piensa", () => {
    const terminada = { ...tool("output-available"), output: { ok: true } };

    expect(estadoDeLaRespuesta("streaming", [usuario, delAsistente(terminada)])).toBe(TEXTO_PENSANDO);
  });

  it("cuando el texto ya está llegando no hace falta ningún aviso", () => {
    const conTexto = delAsistente({ type: "text", text: "Este mes gastaste" });

    expect(estadoDeLaRespuesta("streaming", [usuario, conTexto])).toBeNull();
  });

  it("si después del texto empieza otra tool, muestra la tool", () => {
    const mensaje = delAsistente({ type: "text", text: "Voy a ver." }, tool("input-available"));

    expect(estadoDeLaRespuesta("streaming", [usuario, mensaje])).toBe(usando);
  });

  it("si todavía no hay ninguna parte de la respuesta, piensa", () => {
    expect(estadoDeLaRespuesta("streaming", [usuario])).toBe(TEXTO_PENSANDO);
    expect(estadoDeLaRespuesta("streaming", [usuario, delAsistente()])).toBe(TEXTO_PENSANDO);
  });
});

describe("la línea de estado cita la API que se está consultando", () => {
  const delAsistente = (...partes: unknown[]) => ({ id: "a", role: "assistant", parts: partes }) as AsistenteUIMessage;
  const usuario: AsistenteUIMessage = { id: "u", role: "user", parts: [{ type: "text", text: "Hola" }] };
  const enCurso = (type: string, input?: unknown) => ({ type, toolCallId: "t", state: "input-available", input });
  const estado = (...partes: unknown[]) => estadoDeLaRespuesta("streaming", [usuario, delAsistente(...partes)]);

  it("la cotización del dólar y la conversión se hacen con dolarapi.com", () => {
    expect(estado(enCurso("tool-cotizacion_dolar", {}))).toBe("Consultando la cotización del dólar en dolarapi.com…");
    expect(estado(enCurso("tool-convertir", { monto: 100, de: "USD" }))).toBe(
      "Convirtiendo con la cotización del día en dolarapi.com…"
    );
  });

  it("registrar un movimiento en dólares también busca la cotización en dolarapi.com; en pesos no", () => {
    expect(estado(enCurso("tool-registrar_movimiento", { moneda: "USD" }))).toBe("Registrando el movimiento en dolarapi.com…");
    expect(estado(enCurso("tool-registrar_movimiento", { moneda: "ARS" }))).toBe("Registrando el movimiento…");
    expect(estado(enCurso("tool-registrar_movimiento"))).toBe("Registrando el movimiento…"); // los datos todavía no llegaron
  });

  it("lo que trabaja solo con los datos de la persona no cita ninguna API", () => {
    expect(estado(enCurso("tool-consultar_movimientos", {}))).toBe(TEXTOS_DE_HERRAMIENTAS.consultar_movimientos.usando);
    expect(estado(enCurso("tool-estadisticas", {}))).toBe(TEXTOS_DE_HERRAMIENTAS.estadisticas.usando);
    expect(estado(enCurso("tool-borrar_movimiento", { id: "x" }))).toBe(TEXTOS_DE_HERRAMIENTAS.borrar_movimiento.usando);
  });

  it("un texto que solo trae espacios no cuenta como respuesta que ya está llegando", () => {
    const terminada = { type: "tool-estadisticas", toolCallId: "t", state: "output-available", input: {}, output: { ok: true } };

    expect(estado(terminada, { type: "text", text: "  \n" })).toBe(TEXTO_PENSANDO);
  });
});

describe("mensajeListoParaMostrar (la respuesta se muestra cuando se hizo todo)", () => {
  const delAsistente = (...partes: unknown[]) => ({ id: "a", role: "assistant", parts: partes }) as AsistenteUIMessage;
  const tool = (id: string, state: string) => ({ type: "tool-estadisticas", toolCallId: id, state, input: {}, output: { ok: true } });
  const texto = (text: string) => ({ type: "text" as const, text });

  it("una respuesta que ya terminó, o del usuario, se muestra siempre", () => {
    expect(mensajeListoParaMostrar(delAsistente(tool("t1", "input-available")), false)).toBe(true);
    expect(mensajeListoParaMostrar({ id: "u", role: "user", parts: [texto("Hola")] }, true)).toBe(true);
  });

  it("sin herramientas se muestra desde la primera palabra", () => {
    expect(mensajeListoParaMostrar(delAsistente(texto("Hola")), true)).toBe(true);
    expect(mensajeListoParaMostrar(delAsistente(), true)).toBe(true);
  });

  it("mientras una herramienta trabaja no se muestra", () => {
    expect(mensajeListoParaMostrar(delAsistente(tool("t1", "input-available")), true)).toBe(false);
    expect(mensajeListoParaMostrar(delAsistente(tool("t1", "output-available"), tool("t2", "input-available")), true)).toBe(false);
  });

  it("terminadas las herramientas, espera a que llegue el texto que sigue", () => {
    expect(mensajeListoParaMostrar(delAsistente(tool("t1", "output-available")), true)).toBe(false);
    expect(mensajeListoParaMostrar(delAsistente(tool("t1", "output-available"), texto("  ")), true)).toBe(false);
  });

  it("cuando terminaron todas y llegó el texto de la respuesta, se muestra", () => {
    const lista = delAsistente(tool("t1", "output-available"), tool("t2", "output-available"), texto("Este mes gastaste"));

    expect(mensajeListoParaMostrar(lista, true)).toBe(true);
  });

  it("el texto de antes de la herramienta («Voy a ver») no cuenta como la respuesta", () => {
    expect(mensajeListoParaMostrar(delAsistente(texto("Voy a ver."), tool("t1", "output-available")), true)).toBe(false);
  });

  it("una herramienta que falló también cuenta como terminada", () => {
    expect(mensajeListoParaMostrar(delAsistente(tool("t1", "output-error"), texto("No pude consultarlo.")), true)).toBe(true);
  });
});

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { ChatController } from "@/backend/controllers/chat.controller";
import { MovimientosController } from "@/backend/controllers/movimientos.controller";
import { ErrorDeAplicacion } from "@/backend/erroresBackend";
import { ConversacionesModel } from "@/backend/models/repositorios/conversaciones.model";
import { MovimientosModel } from "@/backend/models/repositorios/movimientos.model";
import { MAX_MENSAJES_CONTEXTO, type AsistenteUIMessage } from "@/shared/chat";
import { borrarUsuariosDePrueba, crearUsuarioLogueado } from "../helpers/usuarioDePrueba";
import { usuarioConChat, codigoDelError, conversar, herramientas, mensajesGuardados } from "../helpers/chatDePrueba";
import { errorDeLaApi, modeloQueFalla, modeloQueLlamaTool, modeloQueResponde } from "../helpers/modeloDePrueba";
import { conVariablesAsync } from "../helpers/variablesDeEntorno";

// NUESTRA orquestación del chat (guardar, errores, timeout, streaming, historial) contra la Supabase local,
// con un modelo de prueba del AI SDK: determinista y sin internet.
afterAll(borrarUsuariosDePrueba);

const mensaje = (role: "user" | "assistant", texto: string): AsistenteUIMessage => ({
  id: randomUUID(),
  role,
  parts: [{ type: "text", text: texto }],
});

describe("ChatController.responder — conversación", () => {
  it("una conversación nueva se crea con el primer mensaje como título, y se guardan la pregunta y la respuesta", async () => {
    const { conversaciones, controller } = await usuarioConChat({
      crearModelo: () => modeloQueResponde("Claro, armemos uno de colas."),
    });
    const id = randomUUID();

    await conversar(controller, id, "¿Cuánto gasté este mes?");

    expect(await conversaciones.obtener(id)).toMatchObject({ titulo: "¿Cuánto gasté este mes?" });
    const [pregunta, respuesta] = await mensajesGuardados(conversaciones, id);
    expect(pregunta.role).toBe("user");
    expect(respuesta).toMatchObject({ role: "assistant" });
    expect(herramientas(respuesta)).toEqual([]);
  });

  it("la respuesta llega palabra por palabra, aunque el modelo la mande en ráfagas", async () => {
    const texto = "Este mes gastaste ciento veinte mil pesos, la mayor parte en el supermercado.";
    const { controller } = await usuarioConChat({ crearModelo: () => modeloQueResponde(texto) });

    const eventos = await conversar(controller, randomUUID(), "¿Cómo vengo?");
    const deltas = eventos.filter((evento) => evento.type === "text-delta").map((evento) => evento.delta ?? "");

    expect(deltas.join("")).toBe(texto);
    for (const delta of deltas) expect(delta.trim().split(/\s+/), JSON.stringify(delta)).toHaveLength(1);
  });
});

describe("ChatController.responder — lo que mide para mostrar", () => {
  it("al empezar manda el modelo y al terminar la demora y los tokens gastados", async () => {
    const { controller } = await usuarioConChat({ crearModelo: () => modeloQueResponde("Hola.") });

    const eventos = await conversar(controller, randomUUID(), "Hola");

    expect(eventos.find((evento) => evento.type === "start")?.messageMetadata).toEqual({ modelo: "modelo-de-prueba" });
    expect(eventos.find((evento) => evento.type === "finish")?.messageMetadata).toMatchObject({
      tokens: { entrada: 120, salida: 30, total: 150 },
    });
    expect(eventos.find((evento) => evento.type === "finish")?.messageMetadata?.ms).toBeGreaterThanOrEqual(0);
  });
});

describe("ChatController.responder — lo que recibe el modelo", () => {
  it("de la última respuesta del asistente va lo que devolvieron sus tools; de las anteriores, solo el texto", async () => {
    const modelo = modeloQueResponde("Seguimos.");
    const { conversaciones, controller } = await usuarioConChat({ crearModelo: () => modelo });
    const id = randomUUID();
    await conversaciones.crear(id, "Dólar");
    /** Una respuesta del asistente que consultó el dólar; `marca` identifica lo que devolvió la tool. */
    const conTool = (toolCallId: string, marca: string, texto: string): AsistenteUIMessage => ({
      id: randomUUID(),
      role: "assistant",
      parts: [
        {
          type: "tool-cotizacion_dolar",
          toolCallId,
          state: "output-available",
          input: { tipoDeDolar: "blue" },
          output: { ok: true, cotizaciones: [{ tipoDeDolar: "blue", compra: 1540, venta: 1560, actualizada: marca }] },
        },
        { type: "text", text: texto },
      ],
    });
    await conversaciones.agregarMensajes(id, [
      mensaje("user", "¿A cuánto está el blue?"),
      conTool("t1", "DATO DE LA PRIMERA RESPUESTA", "El blue está a $ 1.560."),
      mensaje("user", "¿Y el MEP?"),
      conTool("t2", "DATO DE LA ÚLTIMA RESPUESTA", "El MEP está a $ 1.557."),
    ]);

    await conversar(controller, id, "¿Cuál conviene?");

    const prompt = JSON.stringify(modelo.doStreamCalls[0].prompt);
    expect(prompt).toContain("El blue está a $ 1.560.");
    expect(prompt).not.toContain("DATO DE LA PRIMERA RESPUESTA");
    // Si la persona pregunta por lo último que consultó, esos datos siguen a mano.
    expect(prompt).toContain("DATO DE LA ÚLTIMA RESPUESTA");
    expect(prompt).toContain("¿Cuál conviene?");
  });

  it("en un reintento, el mensaje ya guardado queda en su lugar, antes de lo que el asistente alcanzó a responder", async () => {
    // El primer intento registró el gasto y se cortó (ej. se venció el tiempo). Si el mensaje quedara después de esa
    // respuesta, el modelo leería «registré el gasto» y después «gasté 5000» y podría registrarlo otra vez.
    const modelo = modeloQueResponde("Ya quedó registrado.");
    const { conversaciones, controller } = await usuarioConChat({ crearModelo: () => modelo });
    const id = randomUUID();
    await conversaciones.crear(id, "Súper");
    const pregunta = mensaje("user", "Gasté 5000 en el súper con débito");
    await conversaciones.agregarMensajes(id, [pregunta, mensaje("assistant", "Registré el gasto de $ 5.000.")]);

    await conversar(controller, id, "Gasté 5000 en el súper con débito", pregunta.id);

    const prompt = JSON.stringify(modelo.doStreamCalls[0].prompt);
    expect(prompt.indexOf("Gasté 5000 en el súper")).toBeGreaterThan(-1);
    expect(prompt.indexOf("Gasté 5000 en el súper")).toBeLessThan(prompt.indexOf("Registré el gasto de $ 5.000."));
    expect(prompt.match(/Gasté 5000 en el súper/g)).toHaveLength(1); // no se duplica
  });

  it(`del historial van los últimos ${MAX_MENSAJES_CONTEXTO} mensajes, más el nuevo`, async () => {
    const modelo = modeloQueResponde("Dale.");
    // Los mensajes anteriores cuentan para el límite de uso: acá se lo amplía para probar solo el historial.
    const { conversaciones, controller } = await usuarioConChat({
      crearModelo: () => modelo,
      limites: { porMinuto: 1000, porDia: 1000 },
    });
    const id = randomUUID();
    await conversaciones.crear(id, "Larga");
    const anteriores = Array.from({ length: MAX_MENSAJES_CONTEXTO + 5 }, (_, i) => mensaje("user", `mensaje-${i}`));
    await conversaciones.agregarMensajes(id, anteriores);

    await conversar(controller, id, "el nuevo");

    const prompt = JSON.stringify(modelo.doStreamCalls[0].prompt);
    expect(prompt).toContain(`mensaje-${MAX_MENSAJES_CONTEXTO + 4}`); // el último de los anteriores
    expect(prompt).not.toContain('"mensaje-4"'); // uno de los que quedaron afuera
    expect(prompt).toContain("el nuevo");
  });
});

describe("ChatController.responder — errores", () => {
  it("sin OPENAI_API_KEY corta con «asistente_no_disponible» antes de guardar nada", async () => {
    // Sin crearModelo: usa el real, que lee la key de las variables de entorno.
    const usuario = await crearUsuarioLogueado();
    const conversaciones = new ConversacionesModel(usuario.navegador.crearCliente);
    const controller = new ChatController({ modeloConversaciones: () => conversaciones });
    const id = randomUUID();

    const error = await conVariablesAsync({ OPENAI_API_KEY: undefined }, () =>
      conversar(controller, id, "Hola").catch((e: unknown) => e)
    );

    expect(error).toMatchObject({ constructor: ErrorDeAplicacion, codigo: "asistente_no_disponible" });
    expect(await conversaciones.obtener(id)).toBeNull();
  });

  it("si el modelo falla (ej. clave inválida), el error llega en el stream con su código y sin detalles", async () => {
    const claveInvalida = errorDeLaApi(401, {
      message: "Incorrect API key provided: sk-abc***",
      code: "invalid_api_key",
    });
    const { controller } = await usuarioConChat({ crearModelo: () => modeloQueFalla(claveInvalida) });

    const eventos = await conversar(controller, randomUUID(), "Hola");

    expect(codigoDelError(eventos)).toBe("asistente_no_disponible");
    expect(eventos.find((evento) => evento.type === "error")?.errorText).not.toMatch(/api key|401|sk-/i);
  });

  it("si OpenAI está saturado (429), el error es «asistente_saturado» (se puede reintentar)", async () => {
    const saturado = errorDeLaApi(429, { message: "Rate limit reached", code: "rate_limit_exceeded" });
    const { controller } = await usuarioConChat({ crearModelo: () => modeloQueFalla(saturado) });

    expect(codigoDelError(await conversar(controller, randomUUID(), "Hola"))).toBe("asistente_saturado");
  });

  it("no deja escribir en la conversación de otro usuario y no guarda nada", async () => {
    const responde = () => modeloQueResponde("Ok.");
    const duenio = await usuarioConChat({ crearModelo: responde });
    const intruso = await usuarioConChat({ crearModelo: responde });
    const id = randomUUID();
    await conversar(duenio.controller, id, "Mi conversación");

    await expect(conversar(intruso.controller, id, "Hola")).rejects.toMatchObject({
      constructor: ErrorDeAplicacion,
      codigo: "conversacion_no_encontrada",
    });
    expect(await duenio.conversaciones.mensajes(id)).toHaveLength(2);
  });
});

describe("ChatController.responder — tools que pide el modelo", () => {
  /** La parte de la tool en el mensaje guardado del asistente. */
  const parteDeLaTool = (mensaje: AsistenteUIMessage, nombre: string) =>
    mensaje.parts.find((parte) => parte.type === `tool-${nombre}`) as { state: string; output?: unknown } | undefined;

  it("el modelo pide registrar un gasto: la tool lo guarda en la base y su resultado queda en la respuesta", async () => {
    const { modelo, llamadas } = modeloQueLlamaTool("registrar_movimiento", {
      tipo: "gasto",
      monto: 5000,
      moneda: "ARS",
      categoria: "supermercado",
      medioDePago: "debito",
      descripcion: "Súper",
    });
    const { usuario, conversaciones, controller } = await usuarioConChat({ crearModelo: () => modelo });
    const id = randomUUID();

    await conversar(controller, id, "Gasté 5000 en el súper con débito");

    const [, respuesta] = await mensajesGuardados(conversaciones, id);
    expect(parteDeLaTool(respuesta, "registrar_movimiento")).toMatchObject({
      state: "output-available",
      output: { ok: true, movimiento: { monto: 5000, categoria: "supermercado", montoEnPesos: 5000 } },
    });
    expect(llamadas()).toBe(2); // pidió la tool y, con su resultado, respondió
    const guardados = await new MovimientosModel(usuario.navegador.crearCliente).listar({
      desde: "2000-01-01",
      hasta: "2100-12-31",
    });
    expect(guardados).toHaveLength(1);
  });

  it("si el modelo manda datos que no pasan el inputSchema, la tool no se ejecuta y no se guarda nada", async () => {
    const { modelo } = modeloQueLlamaTool("registrar_movimiento", {
      tipo: "gasto",
      monto: -5,
      moneda: "ARS",
      categoria: "supermercado",
      medioDePago: "debito",
      descripcion: "Súper",
    });
    const { usuario, conversaciones, controller } = await usuarioConChat({ crearModelo: () => modelo });
    const id = randomUUID();

    await conversar(controller, id, "Gasté -5");

    const [, respuesta] = await mensajesGuardados(conversaciones, id);
    expect(parteDeLaTool(respuesta, "registrar_movimiento")?.state).toBe("output-error");
    const guardados = await new MovimientosModel(usuario.navegador.crearCliente).listar({
      desde: "2000-01-01",
      hasta: "2100-12-31",
    });
    expect(guardados).toEqual([]);
  });

  it("si la tool falla por dentro (ej. se cae la base), devuelve un fallo en vez de romper la respuesta", async () => {
    const { modelo } = modeloQueLlamaTool("registrar_movimiento", {
      tipo: "gasto",
      monto: 5000,
      moneda: "ARS",
      categoria: "supermercado",
      medioDePago: "debito",
      descripcion: "Súper",
    });
    const baseCaida = { registrar: () => Promise.reject(new Error("connection refused")) } as unknown as MovimientosModel;
    const { conversaciones, controller } = await usuarioConChat({
      crearModelo: () => modelo,
      movimientos: () => new MovimientosController(() => baseCaida),
    });
    const id = randomUUID();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const eventos = await conversar(controller, id, "Gasté 5000 en el súper con débito");

    expect(codigoDelError(eventos)).toBeUndefined(); // la respuesta no se corta
    const [, respuesta] = await mensajesGuardados(conversaciones, id);
    expect(parteDeLaTool(respuesta, "registrar_movimiento")).toMatchObject({
      state: "output-available",
      output: { ok: false, motivo: "error_interno" },
    });
    vi.restoreAllMocks();
  });
});

describe("ChatController.responder — límite de uso", () => {
  it("con el límite por minuto alcanzado corta con «limite_por_minuto» y no guarda el mensaje", async () => {
    const { conversaciones, controller } = await usuarioConChat({
      crearModelo: () => modeloQueResponde("Ok."),
      limites: { porMinuto: 2, porDia: 100 },
    });
    const id = randomUUID();
    await conversar(controller, id, "Uno");
    await conversar(controller, id, "Dos");

    await expect(conversar(controller, id, "Tres")).rejects.toMatchObject({
      constructor: ErrorDeAplicacion,
      codigo: "limite_por_minuto",
    });
    expect(await conversaciones.mensajes(id)).toHaveLength(4); // dos preguntas y dos respuestas, sin la tercera
  });

  it("con el límite por día alcanzado corta con «limite_por_dia»", async () => {
    const { controller } = await usuarioConChat({
      crearModelo: () => modeloQueResponde("Ok."),
      limites: { porMinuto: 1000, porDia: 2 },
    });
    const id = randomUUID();
    await conversar(controller, id, "Uno");
    await conversar(controller, id, "Dos");

    await expect(conversar(controller, id, "Tres")).rejects.toMatchObject({
      constructor: ErrorDeAplicacion,
      codigo: "limite_por_dia",
    });
  });
});

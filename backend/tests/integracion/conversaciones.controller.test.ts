import { randomUUID } from "node:crypto";
import type { UIMessage } from "ai";
import { afterAll, describe, expect, it, vi } from "vitest";
import { Titulador } from "@/backend/asistente/titulador";
import { ConversacionesController } from "@/backend/controllers/conversaciones.controller";
import { ConversacionesModel } from "@/backend/models/repositorios/conversaciones.model";
import { modeloQueFalla, modeloQueGenera } from "../helpers/modeloDePrueba";
import { borrarUsuariosDePrueba, crearUsuarioLogueado } from "../helpers/usuarioDePrueba";

// Sin mocks: contra la base local de Supabase, con usuarios reales logueados.
afterAll(borrarUsuariosDePrueba);

const mensaje = (texto: string): UIMessage => ({
  id: randomUUID(),
  role: "user",
  parts: [{ type: "text", text: texto }],
});

async function usuarioConController() {
  const usuario = await crearUsuarioLogueado();
  const model = new ConversacionesModel(usuario.navegador.crearCliente);
  return { model, controller: new ConversacionesController(() => model) };
}

describe("ConversacionesController", () => {
  it("abrir una conversación que todavía no existe la devuelve vacía (se guarda con el primer mensaje)", async () => {
    const { controller } = await usuarioConController();

    expect(await controller.abrir(randomUUID())).toEqual({ conversacion: null, mensajes: [] });
  });

  it("abrir una conversación guardada trae sus datos y su historial", async () => {
    const { model, controller } = await usuarioConController();
    const id = randomUUID();
    await model.crear(id, "Colas");
    const pregunta = mensaje("¿Qué es NS?");
    await model.agregarMensajes(id, [pregunta]);

    const abierta = await controller.abrir(id);

    expect(abierta.conversacion).toMatchObject({ id, titulo: "Colas" });
    expect(abierta.mensajes).toEqual([pregunta]);
  });

  it("la conversación de otro usuario se abre como si no existiera", async () => {
    const duenio = await usuarioConController();
    const otro = await usuarioConController();
    const id = randomUUID();
    await duenio.model.crear(id, "Privada");
    await duenio.model.agregarMensajes(id, [mensaje("Mi resolución")]);

    expect(await otro.controller.abrir(id)).toEqual({ conversacion: null, mensajes: [] });
  });

  it("lista y borra las conversaciones del usuario; un id inválido no se borra", async () => {
    const { model, controller } = await usuarioConController();
    const id = randomUUID();
    await model.crear(id, "Para borrar");

    expect((await controller.listar()).map((c) => c.id)).toEqual([id]);
    expect(await controller.borrar("no-es-un-id")).toBe(false);
    expect(await controller.borrar(id)).toBe(true);
    expect(await controller.listar()).toEqual([]);
  });
});

describe("ConversacionesController.retitular", () => {
  const respuesta = (texto: string): UIMessage => ({
    id: randomUUID(),
    role: "assistant",
    parts: [{ type: "text", text: texto }],
  });

  /** Una conversación con una charla, y un controller que titula con un modelo de prueba que responde `titulo`. */
  async function conversacionQueSeTitula(titulo: string, conRespuesta = true) {
    const usuario = await crearUsuarioLogueado();
    const model = new ConversacionesModel(usuario.navegador.crearCliente);
    const { modelo, pedidos } = modeloQueGenera(titulo);
    const controller = new ConversacionesController(() => model, new Titulador(), () => modelo);
    const id = randomUUID();
    await model.crear(id, "Gasté 3000 en hot dogs");
    await model.agregarMensajes(id, [
      mensaje("Gasté 3000 en hot dogs"),
      ...(conRespuesta ? [respuesta("¿Con qué pagaste?")] : []),
    ]);
    return { model, controller, id, pedidos };
  }

  it("le pone el título que propone el modelo según la charla y lo guarda", async () => {
    const { model, controller, id, pedidos } = await conversacionQueSeTitula("Gastos en comida");

    expect(await controller.retitular(id)).toBe("Gastos en comida");

    expect((await model.obtener(id))?.titulo).toBe("Gastos en comida");
    expect(JSON.stringify(pedidos[0])).toContain("Título actual: Gasté 3000 en hot dogs");
  });

  it("si el modelo devuelve el mismo título, lo mantiene", async () => {
    const { model, controller, id } = await conversacionQueSeTitula("Gasté 3000 en hot dogs");

    expect(await controller.retitular(id)).toBe("Gasté 3000 en hot dogs");
    expect((await model.obtener(id))?.titulo).toBe("Gasté 3000 en hot dogs");
  });

  it("hasta que el asistente no responde no hay de qué hablar: no llama al modelo y deja el título", async () => {
    const { model, controller, id, pedidos } = await conversacionQueSeTitula("Otro título", false);

    expect(await controller.retitular(id)).toBeNull();

    expect(pedidos).toHaveLength(0);
    expect((await model.obtener(id))?.titulo).toBe("Gasté 3000 en hot dogs");
  });

  it("si el modelo falla, deja el título que había y no lanza", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const usuario = await crearUsuarioLogueado();
    const model = new ConversacionesModel(usuario.navegador.crearCliente);
    const controller = new ConversacionesController(() => model, new Titulador(), () => modeloQueFalla(new Error("sin saldo")));
    const id = randomUUID();
    await model.crear(id, "Colas");
    await model.agregarMensajes(id, [mensaje("Hola"), respuesta("¡Hola!")]);

    expect(await controller.retitular(id)).toBeNull();
    expect((await model.obtener(id))?.titulo).toBe("Colas");
  });

  it("si no se puede crear el modelo (falta la clave), deja el título y no lanza", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const usuario = await crearUsuarioLogueado();
    const model = new ConversacionesModel(usuario.navegador.crearCliente);
    const controller = new ConversacionesController(() => model, new Titulador(), () => {
      throw new Error("Falta OPENAI_API_KEY");
    });
    const id = randomUUID();
    await model.crear(id, "Colas");
    await model.agregarMensajes(id, [mensaje("Hola"), respuesta("¡Hola!")]);

    expect(await controller.retitular(id)).toBeNull();
  });

  it("no toca conversaciones de otra persona ni ids inválidos, y no llama al modelo", async () => {
    const dueno = await conversacionQueSeTitula("Título ajeno");
    const intruso = await crearUsuarioLogueado();
    const modelo = modeloQueGenera("Robado");
    const controllerDelIntruso = new ConversacionesController(
      () => new ConversacionesModel(intruso.navegador.crearCliente),
      new Titulador(),
      () => modelo.modelo
    );

    expect(await controllerDelIntruso.retitular(dueno.id)).toBeNull();
    expect(await controllerDelIntruso.retitular("no-es-un-uuid")).toBeNull();
    expect(await controllerDelIntruso.retitular(undefined)).toBeNull();

    expect(modelo.pedidos).toHaveLength(0);
    expect((await dueno.model.obtener(dueno.id))?.titulo).toBe("Gasté 3000 en hot dogs");
  });
});

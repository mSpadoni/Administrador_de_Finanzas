import { randomUUID } from "node:crypto";
import type { UIMessage } from "ai";
import { afterAll, describe, expect, it, vi } from "vitest";
import { Titulador } from "@/backend/asistente/titulador";
import { ConversacionesServicio } from "@/backend/servicios/conversaciones.servicio";
import { ConversacionesModel } from "@/backend/models/repositorios/conversaciones.model";
import { UsoModel } from "@/backend/models/repositorios/uso.model";
import { modeloQueFalla, modeloQueGenera } from "@/backend/tests/helpers/asistente/modeloDePrueba";
import { borrarUsuariosDePrueba, crearUsuarioLogueado } from "@/backend/tests/helpers/supabase/usuarioDePrueba";

// Sin mocks: contra la base local de Supabase, con usuarios reales logueados. Que un id inválido no llegue al servicio
// lo prueba el controller (unitarios/infraestructura/idsDeLaUrl.test.ts).
afterAll(borrarUsuariosDePrueba);

const mensaje = (texto: string): UIMessage => ({
  id: randomUUID(),
  role: "user",
  parts: [{ type: "text", text: texto }],
});

async function usuarioConServicio() {
  const usuario = await crearUsuarioLogueado();
  const model = new ConversacionesModel(usuario.navegador.crearCliente);
  return { model, servicio: new ConversacionesServicio(() => model) };
}

describe("ConversacionesServicio", () => {
  it("abrir una conversación que todavía no existe la devuelve vacía (se guarda con el primer mensaje)", async () => {
    const { servicio } = await usuarioConServicio();

    expect(await servicio.abrir(randomUUID())).toEqual({ conversacion: null, mensajes: [] });
  });

  it("abrir una conversación guardada trae sus datos y su historial", async () => {
    const { model, servicio } = await usuarioConServicio();
    const id = randomUUID();
    await model.crear(id, "Colas");
    const pregunta = mensaje("¿Qué es NS?");
    await model.agregarMensajes(id, [pregunta]);

    const abierta = await servicio.abrir(id);

    expect(abierta.conversacion).toMatchObject({ id, titulo: "Colas" });
    expect(abierta.mensajes).toEqual([pregunta]);
  });

  it("la conversación de otro usuario se abre como si no existiera", async () => {
    const duenio = await usuarioConServicio();
    const otro = await usuarioConServicio();
    const id = randomUUID();
    await duenio.model.crear(id, "Privada");
    await duenio.model.agregarMensajes(id, [mensaje("Mi resolución")]);

    expect(await otro.servicio.abrir(id)).toEqual({ conversacion: null, mensajes: [] });
  });

  it("lista y borra las conversaciones del usuario", async () => {
    const { model, servicio } = await usuarioConServicio();
    const id = randomUUID();
    await model.crear(id, "Para borrar");

    expect((await servicio.listar()).map((c) => c.id)).toEqual([id]);
    expect(await servicio.borrar(id)).toBe(true);
    expect(await servicio.listar()).toEqual([]);
  });
});

describe("ConversacionesServicio.retitular", () => {
  const respuesta = (texto: string): UIMessage => ({
    id: randomUUID(),
    role: "assistant",
    parts: [{ type: "text", text: texto }],
  });

  /** Una conversación con una charla, y un servicio que titula con un modelo de prueba que responde `titulo`. */
  async function conversacionQueSeTitula(titulo: string, conRespuesta = true) {
    const usuario = await crearUsuarioLogueado();
    const model = new ConversacionesModel(usuario.navegador.crearCliente);
    const { modelo, pedidos } = modeloQueGenera(titulo);
    const servicio = new ConversacionesServicio(
      () => model,
      new Titulador(),
      () => modelo,
      () => new UsoModel(usuario.navegador.crearCliente)
    );
    const id = randomUUID();
    await model.crear(id, "Gasté 3000 en hot dogs");
    await model.agregarMensajes(id, [
      mensaje("Gasté 3000 en hot dogs"),
      ...(conRespuesta ? [respuesta("¿Con qué pagaste?")] : []),
    ]);
    return { model, servicio, id, pedidos };
  }

  it("le pone el título que propone el modelo según la charla y lo guarda", async () => {
    const { model, servicio, id, pedidos } = await conversacionQueSeTitula("Gastos en comida");

    expect(await servicio.retitular(id)).toBe("Gastos en comida");

    expect((await model.obtener(id))?.titulo).toBe("Gastos en comida");
    expect(JSON.stringify(pedidos[0])).toContain("Título actual: Gasté 3000 en hot dogs");
  });

  it("si el modelo devuelve el mismo título, lo mantiene", async () => {
    const { model, servicio, id } = await conversacionQueSeTitula("Gasté 3000 en hot dogs");

    expect(await servicio.retitular(id)).toBe("Gasté 3000 en hot dogs");
    expect((await model.obtener(id))?.titulo).toBe("Gasté 3000 en hot dogs");
  });

  it("hasta que el asistente no responde no hay de qué hablar: no llama al modelo y deja el título", async () => {
    const { model, servicio, id, pedidos } = await conversacionQueSeTitula("Otro título", false);

    expect(await servicio.retitular(id)).toBeNull();

    expect(pedidos).toHaveLength(0);
    expect((await model.obtener(id))?.titulo).toBe("Gasté 3000 en hot dogs");
  });

  it("si el modelo falla, deja el título que había y no lanza", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const usuario = await crearUsuarioLogueado();
    const model = new ConversacionesModel(usuario.navegador.crearCliente);
    const servicio = new ConversacionesServicio(
      () => model,
      new Titulador(),
      () => modeloQueFalla(new Error("sin saldo")),
      () => new UsoModel(usuario.navegador.crearCliente)
    );
    const id = randomUUID();
    await model.crear(id, "Colas");
    await model.agregarMensajes(id, [mensaje("Hola"), respuesta("¡Hola!")]);

    expect(await servicio.retitular(id)).toBeNull();
    expect((await model.obtener(id))?.titulo).toBe("Colas");
  });

  it("si no se puede crear el modelo (falta la clave), deja el título y no lanza", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const usuario = await crearUsuarioLogueado();
    const model = new ConversacionesModel(usuario.navegador.crearCliente);
    const servicio = new ConversacionesServicio(
      () => model,
      new Titulador(),
      () => {
        throw new Error("Falta OPENAI_API_KEY");
      },
      () => new UsoModel(usuario.navegador.crearCliente)
    );
    const id = randomUUID();
    await model.crear(id, "Colas");
    await model.agregarMensajes(id, [mensaje("Hola"), respuesta("¡Hola!")]);

    expect(await servicio.retitular(id)).toBeNull();
  });

  it("no toca conversaciones de otra persona y no llama al modelo", async () => {
    const dueno = await conversacionQueSeTitula("Título ajeno");
    const intruso = await crearUsuarioLogueado();
    const modelo = modeloQueGenera("Robado");
    const servicioDelIntruso = new ConversacionesServicio(
      () => new ConversacionesModel(intruso.navegador.crearCliente),
      new Titulador(),
      () => modelo.modelo,
      () => new UsoModel(intruso.navegador.crearCliente)
    );

    expect(await servicioDelIntruso.retitular(dueno.id)).toBeNull();

    expect(modelo.pedidos).toHaveLength(0);
    expect((await dueno.model.obtener(dueno.id))?.titulo).toBe("Gasté 3000 en hot dogs");
  });
});

describe("ConversacionesServicio.retitular — cuota de títulos", () => {
  it("ponerle título también gasta cuota: pasado el límite, se queda el título que había sin llamar al modelo", async () => {
    const usuario = await crearUsuarioLogueado();
    const model = new ConversacionesModel(usuario.navegador.crearCliente);
    const { modelo, pedidos } = modeloQueGenera("Título nuevo");
    const servicio = new ConversacionesServicio(
      () => model,
      new Titulador(),
      () => modelo,
      () => new UsoModel(usuario.navegador.crearCliente),
      { porMinuto: 1, porDia: 100 }
    );
    const id = randomUUID();
    await model.crear(id, "Colas");
    await model.agregarMensajes(id, [mensaje("Hola"), { ...mensaje("¡Hola!"), role: "assistant" }]);

    expect(await servicio.retitular(id)).toBe("Título nuevo");
    expect(await servicio.retitular(id)).toBeNull();
    expect(pedidos).toHaveLength(1);
  });
});

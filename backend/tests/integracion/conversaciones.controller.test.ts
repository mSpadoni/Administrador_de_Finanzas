import { randomUUID } from "node:crypto";
import type { UIMessage } from "ai";
import { afterAll, describe, expect, it } from "vitest";
import { ConversacionesController } from "@/backend/controllers/conversaciones.controller";
import { ConversacionesModel } from "@/backend/models/repositorios/conversaciones.model";
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

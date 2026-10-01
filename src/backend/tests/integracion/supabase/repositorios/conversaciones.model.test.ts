import { randomUUID } from "node:crypto";
import type { UIMessage } from "ai";
import { afterAll, describe, expect, it } from "vitest";
import { ErrorDeBase } from "@/backend/lib/supabase/erroresSupabase";
import { ConversacionesModel } from "@/backend/models/repositorios/conversaciones.model";
import { ConversacionYaExisteError } from "@/backend/models/repositorios/erroresRepositorios";
import { borrarUsuariosDePrueba, crearUsuarioLogueado, NavegadorDePrueba } from "@/backend/tests/helpers/supabase/usuarioDePrueba";

// Sin mocks: contra la base local de Supabase, con usuarios reales logueados (las políticas RLS se aplican de verdad).
afterAll(borrarUsuariosDePrueba);

/** Un mensaje en el formato del AI SDK. */
function mensaje(role: "user" | "assistant", texto: string): UIMessage {
  return { id: randomUUID(), role, parts: [{ type: "text", text: texto }] };
}

/** Un usuario logueado con su model (cada llamada es como un request de su navegador). */
async function usuarioConModel() {
  const usuario = await crearUsuarioLogueado();
  return { usuario, conversaciones: new ConversacionesModel(usuario.navegador.crearCliente) };
}

describe("ConversacionesModel", () => {
  it("crea una conversación del usuario con el id del navegador y la puede leer", async () => {
    const { conversaciones } = await usuarioConModel();
    const id = randomUUID();

    const creada = await conversaciones.crear(id, "Colas con prioridad");

    expect(creada).toMatchObject({ id, titulo: "Colas con prioridad" });
    expect(await conversaciones.obtener(id)).toMatchObject({ id, titulo: "Colas con prioridad" });
  });

  it("guarda los mensajes y los devuelve en orden, con el formato del AI SDK", async () => {
    const { conversaciones } = await usuarioConModel();
    const id = randomUUID();
    await conversaciones.crear(id, "Prueba");
    const pregunta = mensaje("user", "¿Qué va en E.F.NO C.?");
    const respuesta: UIMessage = {
      id: randomUUID(),
      role: "assistant",
      parts: [{ type: "step-start" }, { type: "text", text: "El mismo evento o nada." }],
    };

    // En una sola operación: el orden lo fija el guardado, no el tiempo entre dos llamadas.
    await conversaciones.agregarMensajes(id, [pregunta, respuesta, mensaje("user", "Gracias")]);

    const guardados = await conversaciones.mensajes(id);
    expect(guardados.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(guardados[0]).toEqual(pregunta);
    expect(guardados[1]).toEqual(respuesta);
  });

  it("guardar dos veces el mismo mensaje (un reintento) no lo duplica", async () => {
    const { conversaciones } = await usuarioConModel();
    const id = randomUUID();
    await conversaciones.crear(id, "Prueba");
    const pregunta = mensaje("user", "¿Qué es NS?");

    await conversaciones.agregarMensajes(id, [pregunta]);
    await conversaciones.agregarMensajes(id, [pregunta]);

    expect(await conversaciones.mensajes(id)).toEqual([pregunta]);
  });

  it("con límite devuelve los últimos mensajes, todavía en orden", async () => {
    const { conversaciones } = await usuarioConModel();
    const id = randomUUID();
    await conversaciones.crear(id, "Prueba");
    await conversaciones.agregarMensajes(
      id,
      ["uno", "dos", "tres", "cuatro"].map((texto) => mensaje("user", texto))
    );

    const ultimos = await conversaciones.mensajes(id, 2);

    expect(ultimos.map((m) => (m.parts[0] as { text: string }).text)).toEqual(["tres", "cuatro"]);
  });

  it("borrar la conversación borra también sus mensajes", async () => {
    const { conversaciones } = await usuarioConModel();
    const id = randomUUID();
    await conversaciones.crear(id, "Para borrar");
    await conversaciones.agregarMensajes(id, [mensaje("user", "Hola")]);

    expect(await conversaciones.borrar(id)).toBe(true);
    expect(await conversaciones.obtener(id)).toBeNull();
    expect(await conversaciones.mensajes(id)).toEqual([]);
  });
});

describe("ConversacionesModel — cada usuario solo ve lo suyo (RLS)", () => {
  it("otro usuario no ve, no lista, no escribe ni borra la conversación", async () => {
    const duenio = await usuarioConModel();
    const otro = await usuarioConModel();
    const id = randomUUID();
    await duenio.conversaciones.crear(id, "Privada");
    await duenio.conversaciones.agregarMensajes(id, [mensaje("user", "Mi resolución")]);

    expect(await otro.conversaciones.obtener(id)).toBeNull();
    expect(await otro.conversaciones.listar()).toEqual([]);
    expect(await otro.conversaciones.mensajes(id)).toEqual([]);
    await expect(otro.conversaciones.agregarMensajes(id, [mensaje("user", "Intruso")])).rejects.toThrow(
      "No se pudieron guardar los mensajes"
    );
    expect(await otro.conversaciones.borrar(id)).toBe(false);

    // Al dueño no le cambió nada.
    expect(await duenio.conversaciones.mensajes(id)).toHaveLength(1);
  });

  it("no se puede crear una conversación con el id de la de otro usuario", async () => {
    const duenio = await usuarioConModel();
    const otro = await usuarioConModel();
    const id = randomUUID();
    await duenio.conversaciones.crear(id, "Original");

    const error = await otro.conversaciones.crear(id, "Copia").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConversacionYaExisteError);
    // La causa es el error de la base: clave duplicada (23505).
    expect((error as Error).cause).toBeInstanceOf(ErrorDeBase);
    expect(((error as Error).cause as ErrorDeBase).codigo).toBe("23505");
  });

  it("sin sesión no se puede crear una conversación", async () => {
    const sinSesion = new ConversacionesModel(new NavegadorDePrueba().crearCliente);

    const error = await sinSesion.crear(randomUUID(), "Anónima").catch((e: unknown) => e);

    // No es «ya existe»: es RLS (42501), y sigue de largo como error de la base.
    expect(error).toBeInstanceOf(ErrorDeBase);
    expect(error).not.toBeInstanceOf(ConversacionYaExisteError);
    expect((error as ErrorDeBase).codigo).toBe("42501");
  });
});

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { ErrorDeAplicacion } from "@/backend/erroresBackend";
import { ErrorDeBase } from "@/backend/lib/supabase/erroresSupabase";
import { UsoModel } from "@/backend/models/repositorios/uso.model";
import { conversar, usuarioConChat } from "@/backend/tests/helpers/asistente/chatDePrueba";
import { modeloQueResponde } from "@/backend/tests/helpers/asistente/modeloDePrueba";
import { borrarUsuariosDePrueba, crearUsuarioLogueado, NavegadorDePrueba } from "@/backend/tests/helpers/supabase/usuarioDePrueba";

// La cuota de uso del asistente contra la base local: la cuenta la hace la función consumir_cuota, en un solo paso.
afterAll(borrarUsuariosDePrueba);

/** Una persona logueada con su cuota. */
async function personaConCuota() {
  const usuario = await crearUsuarioLogueado();
  return { usuario, uso: new UsoModel(usuario.navegador.crearCliente) };
}

describe("UsoModel.consumir", () => {
  it("gasta la cuota de a uno: con 2 por minuto, el tercer pedido alcanza el límite (y no se gasta)", async () => {
    const { uso } = await personaConCuota();
    const limites = { porMinuto: 2, porDia: 100 };

    expect(await uso.consumir("mensaje", limites)).toBeNull();
    expect(await uso.consumir("mensaje", limites)).toBeNull();
    expect(await uso.consumir("mensaje", limites)).toBe("limite_por_minuto");
    // Un límite más alto muestra que el pedido rechazado no se anotó: hay 2 usos, no 3.
    expect(await uso.consumir("mensaje", { porMinuto: 3, porDia: 100 })).toBeNull();
  });

  it("el límite del día pesa más que el del minuto", async () => {
    const { uso } = await personaConCuota();

    expect(await uso.consumir("mensaje", { porMinuto: 1, porDia: 1 })).toBeNull();
    expect(await uso.consumir("mensaje", { porMinuto: 1, porDia: 1 })).toBe("limite_por_dia");
  });

  it("mensajes y títulos tienen cuotas separadas, y cada persona la suya", async () => {
    const una = await personaConCuota();
    const otra = await personaConCuota();
    const limites = { porMinuto: 1, porDia: 100 };

    expect(await una.uso.consumir("mensaje", limites)).toBeNull();
    expect(await una.uso.consumir("titulo", limites)).toBeNull();
    expect(await otra.uso.consumir("mensaje", limites)).toBeNull();
    expect(await una.uso.consumir("mensaje", limites)).toBe("limite_por_minuto");
  });

  it("pedidos a la vez no se pasan del límite: de 6 con lugar para 2, pasan exactamente 2", async () => {
    const { uso } = await personaConCuota();
    const limites = { porMinuto: 2, porDia: 100 };

    const resultados = await Promise.all(Array.from({ length: 6 }, () => uso.consumir("mensaje", limites)));

    expect(resultados.filter((resultado) => resultado === null)).toHaveLength(2);
    expect(resultados.filter((resultado) => resultado === "limite_por_minuto")).toHaveLength(4);
  });

  it("sin sesión no se puede consumir cuota", async () => {
    const sinSesion = new UsoModel(new NavegadorDePrueba().crearCliente);

    await expect(sinSesion.consumir("mensaje", { porMinuto: 10, porDia: 100 })).rejects.toBeInstanceOf(ErrorDeBase);
  });

  it("la persona no puede leer ni escribir la tabla de uso directamente (ni borrar su historial)", async () => {
    const { usuario, uso } = await personaConCuota();
    await uso.consumir("mensaje", { porMinuto: 10, porDia: 100 });
    const cliente = await usuario.navegador.crearCliente();

    const lectura = await cliente.from("uso_del_asistente").select("*");
    const borrado = await cliente.from("uso_del_asistente").delete().gte("id", 0);

    expect(lectura.error?.code).toBe("42501");
    expect(borrado.error?.code).toBe("42501");
  });
});

describe("ChatController — la cuota no se recupera borrando conversaciones", () => {
  it("con el límite alcanzado, borrar la conversación no devuelve mensajes", async () => {
    // Regresión: antes se contaban los mensajes guardados, que se borran con la conversación.
    const { conversaciones, controller } = await usuarioConChat({
      crearModelo: () => modeloQueResponde("Ok."),
      limites: { porMinuto: 2, porDia: 100 },
    });
    const id = randomUUID();
    await conversar(controller, id, "Uno");
    await conversar(controller, id, "Dos");
    await conversaciones.borrar(id);

    await expect(conversar(controller, randomUUID(), "Tres")).rejects.toMatchObject({
      constructor: ErrorDeAplicacion,
      codigo: "limite_por_minuto",
    });
  });
});

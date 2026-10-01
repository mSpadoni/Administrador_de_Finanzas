import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { AuthController } from "@/backend/controllers/auth.controller";
import { ConversacionesController } from "@/backend/controllers/conversaciones.controller";
import { ConversacionesServicio } from "@/backend/servicios/conversaciones.servicio";
import type { AuthModel } from "@/backend/models/repositorios/auth.model";
import type { ConversacionesModel } from "@/backend/models/repositorios/conversaciones.model";

// Lo que llega por la URL (el id de una conversación, el código que manda Google) se valida en el controller antes de
// llegar a un modelo. Los modelos son dobles que fallan si se los usa: si un dato inválido pasa, el test lo nota.

/** Un modelo que falla ante cualquier uso. */
function modeloQueNoSeUsa<T extends object>(): T {
  return new Proxy({} as T, {
    get: () => () => Promise.reject(new Error("no se tendría que haber usado el modelo")),
  });
}

describe("ConversacionesController — el id de la conversación", () => {
  const controller = new ConversacionesController(
    () => new ConversacionesServicio(() => modeloQueNoSeUsa<ConversacionesModel>())
  );

  it.each(["123", "../admin", "", null, 42, `${randomUUID()}x`])(
    "un id que no es un UUID (%s) no llega al modelo: abrir da vacío, borrar da false y retitular da null",
    async (id) => {
      expect(await controller.abrir(id)).toEqual({ conversacion: null, mensajes: [] });
      expect(await controller.borrar(id)).toBe(false);
      expect(await controller.retitular(id)).toBeNull();
    }
  );

  it("un UUID sí llega al modelo", async () => {
    const obtener = vi.fn(async () => null);
    const conModelo = new ConversacionesController(
      () => new ConversacionesServicio(() => ({ obtener }) as unknown as ConversacionesModel)
    );
    const id = randomUUID();

    expect(await conModelo.abrir(id)).toEqual({ conversacion: null, mensajes: [] });
    expect(obtener).toHaveBeenCalledWith(id);
  });
});

describe("AuthController.completarLogin — el código que manda Google", () => {
  it.each([null, "", "   ", "x".repeat(600), ["a"], 42])(
    "un código que falta o no tiene forma de código (%s) da false sin llegar a Supabase",
    async (codigo) => {
      const controller = new AuthController(() => modeloQueNoSeUsa<AuthModel>());

      expect(await controller.completarLogin(codigo)).toBe(false);
    }
  );

  it("un código razonable llega a Supabase sin los espacios de más", async () => {
    const canjearCodigo = vi.fn(async () => true);
    const controller = new AuthController(() => ({ canjearCodigo }) as unknown as AuthModel);

    expect(await controller.completarLogin("  4f1c-abc  ")).toBe(true);
    expect(canjearCodigo).toHaveBeenCalledWith("4f1c-abc");
  });

  it("el código más largo que se acepta (512 caracteres) llega; uno de 513, no", async () => {
    const canjearCodigo = vi.fn(async () => true);
    const controller = new AuthController(() => ({ canjearCodigo }) as unknown as AuthModel);

    expect(await controller.completarLogin("x".repeat(512))).toBe(true);
    expect(await controller.completarLogin("x".repeat(513))).toBe(false);
    expect(canjearCodigo).toHaveBeenCalledTimes(1);
  });
});

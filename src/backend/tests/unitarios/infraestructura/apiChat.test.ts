import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorDeAplicacion } from "@/backend/erroresBackend";
import { AuthNoRespondeError } from "@/backend/models/repositorios/erroresRepositorios";

// La ruta POST /api/chat: qué responde según la sesión y lo que manda el navegador. El login (authController) y el chat
// (chatController) se reemplazan por dobles: acá se prueba solo lo que decide la ruta. Lo que hace el chat se prueba en
// los tests del ChatController, contra la base local.

const obtenerUsuarioActual = vi.hoisted(() => vi.fn());
const responder = vi.hoisted(() => vi.fn());

vi.mock("@/backend/controllers/auth.controller", () => ({ authController: { obtenerUsuarioActual } }));
vi.mock("@/backend/controllers/chat.controller", () => ({ chatController: { responder } }));

const { POST } = await import("@/app/api/chat/route");

afterEach(() => {
  vi.restoreAllMocks();
  obtenerUsuarioActual.mockReset();
  responder.mockReset();
});

const pedido = (cuerpo: string) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: cuerpo,
  });

const USUARIO = { id: "u1", nombre: "Mateo", email: "mateo@ejemplo.com", avatarUrl: null };

describe("POST /api/chat", () => {
  it("sin sesión: 401 «no_autenticado» con el mensaje de sesión vencida, sin llamar al chat", async () => {
    obtenerUsuarioActual.mockResolvedValue(null);

    const respuesta = await POST(pedido("{}"));

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual({
      error: { codigo: "no_autenticado", mensaje: "Tu sesión expiró. Volvé a ingresar con Google." },
    });
    expect(responder).not.toHaveBeenCalled();
  });

  it("si Supabase Auth no responde: 500 «error_interno», nunca «tu sesión expiró» (regresión de 295733e)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    obtenerUsuarioActual.mockRejectedValue(new AuthNoRespondeError("Supabase Auth no respondió: fetch failed"));

    const respuesta = await POST(pedido("{}"));

    expect(respuesta.status).toBe(500);
    expect((await respuesta.json()).error.codigo).toBe("error_interno");
  });

  it("si el cuerpo no es JSON, el chat recibe null y el pedido inválido se responde 400", async () => {
    obtenerUsuarioActual.mockResolvedValue(USUARIO);
    responder.mockImplementation(async (cuerpo: unknown) => {
      if (cuerpo === null) throw new ErrorDeAplicacion("pedido_invalido", "El pedido no es válido.");
      return new ReadableStream();
    });

    const respuesta = await POST(pedido("esto no es json"));

    expect(responder).toHaveBeenCalledWith(null);
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error.codigo).toBe("pedido_invalido");
  });

  it("con sesión y un pedido válido, responde la respuesta del asistente en streaming (200)", async () => {
    obtenerUsuarioActual.mockResolvedValue(USUARIO);
    responder.mockResolvedValue(
      new ReadableStream({
        start(controlador) {
          controlador.close();
        },
      })
    );

    const respuesta = await POST(pedido(JSON.stringify({ id: "x", mensaje: {} })));

    expect(responder).toHaveBeenCalledWith({ id: "x", mensaje: {} });
    expect(respuesta.status).toBe(200);
  });
});

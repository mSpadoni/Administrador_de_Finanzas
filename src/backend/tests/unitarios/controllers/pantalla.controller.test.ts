import { afterEach, describe, expect, it, vi } from "vitest";
import { PantallaController } from "@/backend/controllers/pantalla.controller";
import type { ConversacionesServicio } from "@/backend/servicios/conversaciones.servicio";
import type { MovimientosServicio } from "@/backend/servicios/movimientos.servicio";

// Lo que lee la página de una conversación: la lista del costado, el historial y el resumen del mes, a la vez. Los
// servicios son dobles en memoria (lo que guardan de verdad se prueba contra la base en integracion/).

afterEach(() => vi.restoreAllMocks());

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MENSAJES = [{ id: "m1", role: "user", parts: [{ type: "text", text: "Hola" }] }];
const ESTADISTICAS = { resumen: { ingresos: 0, gastos: 100, balance: -100 } };

function controller({
  estadisticas = () => Promise.resolve(ESTADISTICAS),
  listar = () =>
    Promise.resolve([
      { id: ID, titulo: "Gastos", usuario_id: "u1", creado_en: "2026-10-01", actualizado_en: "2026-10-01" },
    ]),
  abrir = () => Promise.resolve({ conversacion: null, mensajes: MENSAJES }),
}: {
  estadisticas?: () => Promise<unknown>;
  listar?: () => Promise<unknown>;
  abrir?: () => Promise<unknown>;
} = {}) {
  const conversaciones = { listar, abrir } as unknown as ConversacionesServicio;
  const movimientos = { estadisticasDelMes: estadisticas } as unknown as MovimientosServicio;
  return new PantallaController(
    () => conversaciones,
    () => movimientos
  );
}

describe("PantallaController.abrir", () => {
  it("junta la lista, el historial y el resumen del mes", async () => {
    const pantalla = await controller().abrir(ID);

    expect(pantalla.mensajes).toEqual(MENSAJES);
    expect(pantalla.estadisticasDelMes).toEqual(ESTADISTICAS);
  });

  it("al navegador solo viajan el id y el título de cada conversación (no las fechas ni el usuario)", async () => {
    const pantalla = await controller().abrir(ID);

    expect(pantalla.conversaciones).toEqual([{ id: ID, titulo: "Gastos" }]);
  });

  it("si falla el resumen del mes, la página se abre igual con el resumen en null y el error queda en el log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const pantalla = await controller({ estadisticas: () => Promise.reject(new Error("la base no responde")) }).abrir(
      ID
    );

    expect(pantalla.estadisticasDelMes).toBeNull();
    expect(pantalla.mensajes).toEqual(MENSAJES);
    expect(log.mock.calls.map((llamada) => String(llamada[0])).join("\n")).toContain("pantalla.resumen_del_mes");
  });

  it.each([
    ["la lista", { listar: () => Promise.reject(new Error("falló la lista")) }],
    ["el historial", { abrir: () => Promise.reject(new Error("falló el historial")) }],
  ])("si falla %s, el error sigue de largo (eso no se puede disimular)", async (_caso, falla) => {
    await expect(controller(falla).abrir(ID)).rejects.toThrow(/falló/);
  });
});

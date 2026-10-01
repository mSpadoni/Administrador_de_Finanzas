import { afterAll, describe, expect, it } from "vitest";
import type { Database } from "@/backend/types/database";
import { borrarUsuariosDePrueba, crearUsuarioLogueado, NavegadorDePrueba } from "@/backend/tests/helpers/supabase/usuarioDePrueba";

// La tabla movimientos contra la base local de Supabase: las políticas RLS y los check que protegen los datos
// aunque el código tenga un bug. Personas reales logueadas, sin mocks.
afterAll(borrarUsuariosDePrueba);

type NuevoMovimiento = Database["public"]["Tables"]["movimientos"]["Insert"];

/** Un gasto en pesos válido; cada test cambia lo que quiere probar. */
const gasto = (cambios: Partial<NuevoMovimiento> = {}): NuevoMovimiento => ({
  tipo: "gasto",
  monto: 15000,
  moneda: "ARS",
  monto_en_pesos: 15000,
  categoria: "supermercado",
  medio_de_pago: "debito",
  descripcion: "Compra del súper",
  fecha: "2026-09-29",
  ...cambios,
});

/** Una persona logueada con su cliente de Supabase (con su sesión, así se aplican sus políticas RLS). */
async function personaConCliente() {
  const persona = await crearUsuarioLogueado();
  return { persona, cliente: await persona.navegador.crearCliente() };
}

describe("movimientos — lo que puede hacer cada persona (RLS)", () => {
  it("una persona registra un gasto y lo lee; el dueño se completa solo con quien está logueado", async () => {
    const { persona, cliente } = await personaConCliente();

    const { data, error } = await cliente.from("movimientos").insert(gasto()).select().single();

    expect(error).toBeNull();
    expect(data).toMatchObject({ usuario_id: persona.id, monto: 15000, categoria: "supermercado" });
    const { data: leidos } = await cliente.from("movimientos").select("id");
    expect(leidos).toEqual([{ id: data!.id }]);
  });

  it("otra persona no ve, no corrige ni borra ese movimiento", async () => {
    const duenio = await personaConCliente();
    const otra = await personaConCliente();
    const { data: creado } = await duenio.cliente.from("movimientos").insert(gasto()).select("id").single();

    const { data: visto } = await otra.cliente.from("movimientos").select("id").eq("id", creado!.id);
    const { data: corregido } = await otra.cliente
      .from("movimientos")
      .update({ monto: 1, monto_en_pesos: 1 })
      .eq("id", creado!.id)
      .select("id");
    const { data: borrado } = await otra.cliente.from("movimientos").delete().eq("id", creado!.id).select("id");

    expect(visto).toEqual([]);
    expect(corregido).toEqual([]);
    expect(borrado).toEqual([]);
    const { data: intacto } = await duenio.cliente.from("movimientos").select("monto").eq("id", creado!.id).single();
    expect(intacto).toEqual({ monto: 15000 });
  });

  it("no se puede registrar un movimiento a nombre de otra persona", async () => {
    const { cliente } = await personaConCliente();
    const otra = await crearUsuarioLogueado();

    const { error } = await cliente.from("movimientos").insert(gasto({ usuario_id: otra.id }));

    expect(error).not.toBeNull();
  });

  it("sin sesión no se puede leer ni registrar nada", async () => {
    const sinSesion = await new NavegadorDePrueba().crearCliente();

    const { data } = await sinSesion.from("movimientos").select("id");
    const { error } = await sinSesion.from("movimientos").insert(gasto());

    expect(data ?? []).toEqual([]);
    expect(error).not.toBeNull();
  });
});

describe("movimientos — lo que la base no acepta (check)", () => {
  it("rechaza datos que no tienen sentido", async () => {
    const { cliente } = await personaConCliente();
    const invalidos: [string, NuevoMovimiento][] = [
      ["monto cero", gasto({ monto: 0, monto_en_pesos: 0 })],
      ["categoría de ingreso en un gasto", gasto({ categoria: "sueldo" })],
      ["categoría de gasto en un ingreso", gasto({ tipo: "ingreso", categoria: "supermercado" })],
      ["en pesos con cotización", gasto({ tipo_de_dolar: "oficial", cotizacion: 1400 })],
      ["en pesos con monto en pesos distinto", gasto({ monto_en_pesos: 20000 })],
      ["en dólares sin cotización", gasto({ moneda: "USD", monto: 20, monto_en_pesos: 28000 })],
      ["medio de pago desconocido", gasto({ medio_de_pago: "cheque" })],
      ["descripción vacía", gasto({ descripcion: "" })],
    ];

    for (const [caso, movimiento] of invalidos) {
      const { error } = await cliente.from("movimientos").insert(movimiento);
      expect(error, caso).not.toBeNull();
    }
    const { data } = await cliente.from("movimientos").select("id");
    expect(data).toEqual([]);
  });

  it("acepta un ingreso en dólares con su tipo de dólar, su cotización y su monto en pesos", async () => {
    const { cliente } = await personaConCliente();

    const { error } = await cliente.from("movimientos").insert(
      gasto({
        tipo: "ingreso",
        categoria: "trabajo_independiente",
        moneda: "USD",
        monto: 300,
        monto_en_pesos: 420000,
        tipo_de_dolar: "mep",
        cotizacion: 1400,
        medio_de_pago: "transferencia",
        descripcion: "Trabajo para un cliente del exterior",
      })
    );

    expect(error).toBeNull();
  });
});

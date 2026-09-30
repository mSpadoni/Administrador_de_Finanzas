// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AsistenteUIMessage, EstadisticasDelPeriodo, MovimientoGuardado } from "@/shared/chat";
import MessageBubble from "@/views/chat/MessageBubble";
import PanelDelMes, { CATEGORIAS_EN_EL_PANEL } from "@/views/chat/PanelDelMes";
import { cambioLosMovimientos } from "@/views/chat/respuesta";
import { MAX_FILAS_EN_TABLA } from "@/views/chat/TarjetasDeResultado";

// Lo que ve la persona cuando el asistente usa una tool: las tarjetas, la tabla, las barras y el panel «Este mes».
// Componentes reales en un DOM (jsdom), leídos por rol y nombre accesible. Los resultados son los que devuelven las tools.
afterEach(cleanup);

const gasto = (cambios: Partial<MovimientoGuardado> = {}): MovimientoGuardado => ({
  id: "11111111-1111-4111-8111-111111111111",
  tipo: "gasto",
  monto: 15000,
  moneda: "ARS",
  categoria: "supermercado",
  medioDePago: "debito",
  descripcion: "Súper Coto",
  fecha: "2026-09-29",
  montoEnPesos: 15000,
  cotizacion: null,
  ...cambios,
});

const ESTADISTICAS: EstadisticasDelPeriodo = {
  periodo: { desde: "2026-09-01", hasta: "2026-09-30" },
  resumen: { ingresos: 1000000, gastos: 250000, balance: 750000 },
  porCategoria: [
    { tipo: "gasto", categoria: "supermercado", total: 150000, porcentaje: 60 },
    { tipo: "gasto", categoria: "ocio", total: 100000, porcentaje: 40 },
    { tipo: "ingreso", categoria: "sueldo", total: 1000000, porcentaje: 100 },
  ],
  promedioDiarioDeGastos: 8333.33,
  variacionDeGastos: { anterior: 200000, porcentaje: 25 },
};

/** Un mensaje del asistente que usó una tool y contestó. */
function conTool(tool: Record<string, unknown>, texto = "Listo."): AsistenteUIMessage {
  return {
    id: "m1",
    role: "assistant",
    parts: [
      { toolCallId: "t1", state: "output-available", input: {}, ...tool },
      { type: "text", text: texto },
    ],
  } as AsistenteUIMessage;
}

const mostrar = (mensaje: AsistenteUIMessage) =>
  render(
    <ol>
      <MessageBubble mensaje={mensaje} />
    </ol>
  );

describe("tarjeta del movimiento registrado", () => {
  it("muestra qué se registró: tipo, monto, descripción, categoría, medio de pago y fecha", () => {
    mostrar(conTool({ type: "tool-registrar_movimiento", output: { ok: true, movimiento: gasto() } }));

    const tarjeta = screen.getByRole("article", { name: "Movimiento registrado" });
    expect(tarjeta).toHaveTextContent("Gasto registrado");
    expect(tarjeta).toHaveTextContent(/\$\s15\.000/);
    expect(tarjeta).toHaveTextContent("Súper Coto");
    expect(tarjeta).toHaveTextContent("Supermercado");
    expect(tarjeta).toHaveTextContent("Débito");
    expect(tarjeta).toHaveTextContent("29/09/2026");
  });

  it("un gasto en dólares muestra cuánto fue en pesos y con qué cotización", () => {
    mostrar(
      conTool({
        type: "tool-registrar_movimiento",
        output: {
          ok: true,
          movimiento: gasto({
            monto: 100,
            moneda: "USD",
            montoEnPesos: 145000,
            cotizacion: { tipoDeDolar: "tarjeta", valor: 1450 },
          }),
        },
      })
    );

    const tarjeta = screen.getByRole("article", { name: "Movimiento registrado" });
    expect(tarjeta).toHaveTextContent(/US\$\s100/);
    expect(tarjeta).toHaveTextContent(/Equivale a \$\s145\.000/);
    expect(tarjeta).toHaveTextContent(/dólar tarjeta a \$\s1\.450/);
  });

  it("un ingreso se distingue de un gasto con texto, no solo con color", () => {
    mostrar(
      conTool({
        type: "tool-registrar_movimiento",
        output: { ok: true, movimiento: gasto({ tipo: "ingreso", categoria: "sueldo" }) },
      })
    );

    expect(screen.getByRole("article", { name: "Movimiento registrado" })).toHaveTextContent("Ingreso registrado");
  });

  it("si la tool falló no dibuja una tarjeta de éxito", () => {
    mostrar(
      conTool({
        type: "tool-registrar_movimiento",
        output: { ok: false, motivo: "datos_invalidos", detalle: "El monto tiene que ser mayor que cero." },
      })
    );

    expect(screen.queryByRole("article", { name: "Movimiento registrado" })).toBeNull();
  });

  it("mientras la tool trabaja no hay tarjeta todavía", () => {
    mostrar(conTool({ type: "tool-registrar_movimiento", state: "input-available" }));

    expect(screen.queryByRole("article")).toBeNull();
  });
});

describe("tabla de movimientos", () => {
  const consulta = (movimientos: MovimientoGuardado[]) =>
    conTool({
      type: "tool-consultar_movimientos",
      output: {
        ok: true,
        periodo: { desde: "2026-09-01", hasta: "2026-09-30" },
        movimientos,
        resumen: { ingresos: 0, gastos: 15000, balance: -15000 },
      },
    });

  it("es una tabla con encabezados, una fila por movimiento y el resumen del período", () => {
    mostrar(consulta([gasto(), gasto({ id: "22222222-2222-4222-8222-222222222222", descripcion: "Nafta" })]));

    const tabla = screen.getByRole("table", { name: "Movimientos del 01/09/2026 al 30/09/2026" });
    expect(
      within(tabla)
        .getAllByRole("columnheader")
        .map((c) => c.textContent)
    ).toEqual(["Fecha", "Descripción", "Categoría", "Monto"]);
    expect(within(tabla).getAllByRole("row")).toHaveLength(3); // encabezado + 2 movimientos
    expect(within(tabla).getByText("Nafta")).toBeVisible();
    expect(screen.getByText("Balance").nextSibling).toHaveTextContent(/-?\s?\$\s15\.000/);
  });

  it("un gasto se lee «Gasto de …» para el lector de pantalla", () => {
    mostrar(consulta([gasto()]));

    expect(screen.getByRole("cell", { name: /Gasto de/ })).toBeInTheDocument();
  });

  it("sin movimientos lo dice en vez de mostrar una tabla vacía", () => {
    mostrar(consulta([]));

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("region", { name: /Movimientos del 01\/09\/2026/ })).toHaveTextContent(
      "no hay movimientos"
    );
  });

  it("con muchos movimientos muestra los primeros y avisa cuántos faltan", () => {
    const muchos = Array.from({ length: MAX_FILAS_EN_TABLA + 5 }, (_, i) =>
      gasto({ id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, descripcion: `Compra ${i}` })
    );
    mostrar(consulta(muchos));

    expect(screen.getAllByRole("row")).toHaveLength(MAX_FILAS_EN_TABLA + 1);
    expect(screen.getByText("Y 5 más en este período.")).toBeVisible();
  });
});

describe("estadísticas con barras por categoría", () => {
  it("muestra el resumen, el promedio diario, la variación y cada categoría con su monto y porcentaje", () => {
    mostrar(conTool({ type: "tool-estadisticas", output: { ok: true, estadisticas: ESTADISTICAS } }));

    const tarjeta = screen.getByRole("region", { name: "Estadísticas del 01/09/2026 al 30/09/2026" });
    expect(tarjeta).toHaveTextContent(/Promedio diario de gastos: \$\s8\.333,33/);
    expect(tarjeta).toHaveTextContent("▲ 25% más que el período anterior");
    const categorias = within(screen.getByRole("list", { name: "Gastos por categoría" })).getAllByRole("listitem");
    expect(categorias).toHaveLength(2); // los ingresos no van en las barras de gastos
    expect(categorias[0]).toHaveTextContent("Supermercado");
    expect(categorias[0]).toHaveTextContent("60%");
  });

  it("el ancho de cada barra es su porcentaje (y la barra no se lee: el número ya está escrito)", () => {
    const { container } = mostrar(
      conTool({ type: "tool-estadisticas", output: { ok: true, estadisticas: ESTADISTICAS } })
    );

    const barras = [...container.querySelectorAll<HTMLElement>('[aria-hidden="true"] > div')];
    expect(barras.map((b) => b.style.width)).toEqual(["60%", "40%"]);
  });

  it("sin gastos en el período no dibuja barras", () => {
    mostrar(
      conTool({
        type: "tool-estadisticas",
        output: {
          ok: true,
          estadisticas: { ...ESTADISTICAS, porCategoria: [], resumen: { ingresos: 0, gastos: 0, balance: 0 } },
        },
      })
    );

    expect(screen.queryByRole("list", { name: "Gastos por categoría" })).toBeNull();
    expect(screen.getByText("No hubo gastos en este período.")).toBeVisible();
  });
});

describe("cotización del dólar", () => {
  it("muestra el tipo, la compra, la venta y cuándo se actualizó", () => {
    mostrar(
      conTool({
        type: "tool-cotizacion_dolar",
        output: {
          ok: true,
          cotizaciones: [{ tipoDeDolar: "blue", compra: 1400, venta: 1430, actualizada: "2026-09-29T17:30:00.000Z" }],
        },
      })
    );

    const tarjeta = screen.getByRole("region", { name: "Cotización del dólar" });
    expect(tarjeta).toHaveTextContent("Dólar blue");
    expect(tarjeta).toHaveTextContent(/Compra \$\s1\.400/);
    expect(tarjeta).toHaveTextContent(/Venta \$\s1\.430/);
    expect(tarjeta).toHaveTextContent("Actualizada el 29/09 14:30");
    expect(tarjeta).toHaveTextContent("Fuente: dolarapi.com"); // se cita la fuente de la API externa
  });

  it("una conversión muestra el resultado con la compra y con la venta", () => {
    mostrar(
      conTool({
        type: "tool-convertir",
        output: {
          ok: true,
          monto: 100,
          de: "USD",
          a: "ARS",
          tipoDeDolar: "oficial",
          conCompra: 140000,
          conVenta: 145000,
          actualizada: "2026-09-29T17:30:00.000Z",
        },
      })
    );

    const tarjeta = screen.getByRole("region", { name: "Conversión" });
    expect(tarjeta).toHaveTextContent(/US\$\s100 en dólar oficial/);
    expect(tarjeta).toHaveTextContent(/compra: \$\s140\.000/);
    expect(tarjeta).toHaveTextContent(/venta: \$\s145\.000/);
    expect(tarjeta).toHaveTextContent("Fuente: dolarapi.com");
  });
});

describe("el texto del asistente sigue estando", () => {
  it("la tarjeta se suma al texto, no lo reemplaza", () => {
    mostrar(
      conTool(
        { type: "tool-registrar_movimiento", output: { ok: true, movimiento: gasto() } },
        "Anoté tu gasto del súper."
      )
    );

    expect(screen.getByText("Anoté tu gasto del súper.")).toBeVisible();
    expect(screen.getByRole("article", { name: "Movimiento registrado" })).toBeVisible();
  });
});

describe("panel «Este mes»", () => {
  it("muestra el mes, ingresos, gastos, balance y las categorías donde más se gasta", () => {
    render(<PanelDelMes estadisticas={ESTADISTICAS} />);

    const panel = screen.getByRole("complementary", { name: "Este mes", hidden: true });
    expect(panel).toHaveTextContent("septiembre de 2026");
    expect(panel).toHaveTextContent(/Ingresos\s*\$\s1\.000\.000/);
    expect(panel).toHaveTextContent(/Gastos\s*\$\s250\.000/);
    expect(panel).toHaveTextContent(/Balance\s*\$\s750\.000/);
    expect(panel).toHaveTextContent("Supermercado");
    expect(panel).not.toHaveTextContent("Sueldo"); // solo gastos
  });

  it(`muestra como mucho ${CATEGORIAS_EN_EL_PANEL} categorías`, () => {
    const categorias = [
      "supermercado",
      "ocio",
      "ropa",
      "salud",
      "servicios",
      "vivienda",
      "transporte",
      "otros",
    ] as const;
    const muchas = categorias.map((categoria, i) => ({
      tipo: "gasto" as const,
      categoria,
      total: 1000 - i,
      porcentaje: 12.5,
    }));
    render(<PanelDelMes estadisticas={{ ...ESTADISTICAS, porCategoria: muchas }} />);

    const panel = screen.getByRole("complementary", { hidden: true });
    expect(within(panel).getAllByRole("listitem", { hidden: true })).toHaveLength(CATEGORIAS_EN_EL_PANEL);
  });

  it("un mes sin gastos lo dice", () => {
    render(
      <PanelDelMes
        estadisticas={{ ...ESTADISTICAS, porCategoria: [], resumen: { ingresos: 0, gastos: 0, balance: 0 } }}
      />
    );

    expect(screen.getByText("Todavía no registraste gastos este mes.")).toBeInTheDocument();
  });

  it("si no se pudo leer el resumen avisa, sin romper la pantalla", () => {
    render(<PanelDelMes estadisticas={null} />);

    expect(screen.getByText(/No pudimos cargar el resumen del mes/)).toBeInTheDocument();
  });
});

describe("cambioLosMovimientos: cuándo se actualiza el panel", () => {
  it("después de registrar o borrar un movimiento", () => {
    const registro = conTool({ type: "tool-registrar_movimiento", output: { ok: true, movimiento: gasto() } });
    const borrado = conTool({ type: "tool-borrar_movimiento", output: { ok: true } });

    expect(cambioLosMovimientos(registro)).toBe(true);
    expect(cambioLosMovimientos(borrado)).toBe(true);
  });

  it("no cuando la tool falló, todavía no terminó o solo consultó", () => {
    const fallo = conTool({
      type: "tool-registrar_movimiento",
      output: { ok: false, motivo: "datos_invalidos", detalle: "x" },
    });
    const enCurso = conTool({ type: "tool-registrar_movimiento", state: "input-available" });
    const consulta = conTool({ type: "tool-estadisticas", output: { ok: true, estadisticas: ESTADISTICAS } });

    expect(cambioLosMovimientos(fallo)).toBe(false);
    expect(cambioLosMovimientos(enCurso)).toBe(false);
    expect(cambioLosMovimientos(consulta)).toBe(false);
  });
});

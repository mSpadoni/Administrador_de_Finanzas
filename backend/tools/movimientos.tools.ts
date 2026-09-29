import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { clienteDolar, type ClienteDolar, type MotivoError } from "@/backend/lib/dolar";
import { estadisticas, resumen, type Estadisticas, type Resumen } from "@/backend/models/dominio/estadisticas";
import {
  CATEGORIAS,
  DatosDeMovimientoSchema,
  FechaSchema,
  MEDIOS_DE_PAGO,
  MONEDAS,
  montoEnPesos,
  TIPOS_DE_DOLAR,
  TIPOS_DE_MOVIMIENTO,
  valorDeCotizacion,
  type CotizacionUsada,
  type Moneda,
  type Movimiento,
  type TipoDeDolar,
} from "@/backend/models/dominio/movimiento";
import {
  hoyEnArgentina,
  periodoAnterior,
  resolverPeriodo,
  type PedidoDePeriodo,
  type Periodo,
} from "@/backend/models/dominio/periodo";
import { movimientosModel, type MovimientosModel } from "@/backend/models/repositorios/movimientos.model";

// Las tools con las que el asistente registra y consulta los movimientos de la persona. Los números salen siempre
// de la base o de dolarapi, nunca del modelo. Ninguna lanza por un dato mal pedido: devuelven { ok: false, motivo,
// detalle } para que el modelo corrija o se lo explique a la persona. Un error de la base sí se propaga (la tool
// queda con error y el modelo lo ve).

/** Lo que necesitan las tools: el repositorio (con la sesión del pedido), el cliente del dólar y el día de hoy. */
export type DependenciasDeMovimientos = {
  movimientos?: MovimientosModel;
  dolar?: ClienteDolar;
  /** La fecha de hoy en Argentina (AAAA-MM-DD). */
  hoy?: () => string;
};

/** Por qué una tool no pudo hacer lo que se le pidió. */
export type FalloDeTool = {
  ok: false;
  motivo: MotivoError | "datos_invalidos" | "no_encontrado";
  detalle: string;
};

export type MovimientoRegistrado = { ok: true; movimiento: Movimiento } | FalloDeTool;
export type MovimientosConsultados =
  { ok: true; periodo: Periodo; movimientos: Movimiento[]; resumen: Resumen } | FalloDeTool;
export type EstadisticasConsultadas = { ok: true; estadisticas: Estadisticas } | FalloDeTool;
export type MovimientoBorrado = { ok: true } | FalloDeTool;
export type Conversion =
  | {
      ok: true;
      monto: number;
      de: Moneda;
      a: Moneda;
      tipoDeDolar: TipoDeDolar;
      conCompra: number;
      conVenta: number;
      actualizada: string;
    }
  | FalloDeTool;

/** Todas las categorías, para que el modelo elija de la lista (que corresponda al tipo lo valida el dominio). */
const TODAS_LAS_CATEGORIAS = [...new Set([...CATEGORIAS.gasto, ...CATEGORIAS.ingreso])] as [string, ...string[]];

const PeriodoSchema = z
  .object({
    unidad: z.enum(["dia", "semana", "mes"]).optional().describe("Día, semana (lunes a domingo) o mes calendario."),
    referencia: FechaSchema.optional().describe("Una fecha dentro del período (AAAA-MM-DD). Sin valor: hoy."),
    desde: FechaSchema.optional().describe("Rango explícito: primer día (AAAA-MM-DD). Tiene prioridad sobre unidad."),
    hasta: FechaSchema.optional().describe("Rango explícito: último día (AAAA-MM-DD). Sin valor: hoy."),
  })
  .optional()
  .describe(
    "Sin valor: el mes actual. Ej.: 'la semana pasada' = { unidad: 'semana', referencia: <un día de la semana pasada> }."
  );

const datosInvalidos = (detalle: string): FalloDeTool => ({ ok: false, motivo: "datos_invalidos", detalle });

/** El período pedido, o por qué no se puede armar (ej. un rango al revés). */
function periodoPedido(pedido: PedidoDePeriodo | undefined, hoy: string): Periodo | FalloDeTool {
  try {
    return resolverPeriodo(pedido ?? {}, hoy);
  } catch (error) {
    return datosInvalidos(error instanceof Error ? error.message : "El período no es válido.");
  }
}

const redondear = (valor: number) => Math.round(valor * 100) / 100;

/** Las tools de movimientos y del dólar para convertir. Sin dependencias, usa las de la app. */
export function crearToolsMovimientos({
  movimientos = movimientosModel,
  dolar = clienteDolar,
  hoy = () => hoyEnArgentina(new Date()),
}: DependenciasDeMovimientos = {}) {
  return {
    registrar_movimiento: tool({
      description:
        "Registra un gasto o un ingreso de la persona. Usala cuando cuente algo que gastó o cobró. Si es en dólares, " +
        "la herramienta busca la cotización del día y guarda también el monto en pesos (no la calcules vos). Una " +
        "compra en cuotas es un solo gasto por el total. Si falta un dato que no podés deducir (el monto, o si fue " +
        "gasto o ingreso), preguntalo antes de registrar.",
      inputSchema: z.object({
        tipo: z.enum(TIPOS_DE_MOVIMIENTO),
        monto: z.number().positive().describe("En la moneda indicada, hasta dos decimales."),
        moneda: z.enum(MONEDAS).describe("ARS (pesos) o USD (dólares)."),
        categoria: z
          .enum(TODAS_LAS_CATEGORIAS)
          .describe(
            `Gastos: ${CATEGORIAS.gasto.join(", ")}. Ingresos: ${CATEGORIAS.ingreso.join(", ")}. Si no encaja, "otros".`
          ),
        medioDePago: z.enum(MEDIOS_DE_PAGO).describe("Si no lo dice, preguntá o usá el más probable."),
        descripcion: z
          .string()
          .describe("Corta, en palabras de la persona (ej. 'Súper Coto', 'Sueldo de septiembre')."),
        fecha: FechaSchema.optional().describe("El día del movimiento (AAAA-MM-DD). Sin valor: hoy."),
        tipoDeDolar: z
          .enum(TIPOS_DE_DOLAR)
          .optional()
          .describe("Solo si es en dólares. Sin valor: oficial. Una compra con tarjeta en dólares: tarjeta."),
      }),
      execute: async ({ tipoDeDolar, fecha, ...datos }): Promise<MovimientoRegistrado> => {
        const validados = DatosDeMovimientoSchema.safeParse({ ...datos, fecha: fecha ?? hoy() });
        if (!validados.success) return datosInvalidos(validados.error.issues[0]?.message ?? "Datos inválidos.");

        let cotizacion: CotizacionUsada | null = null;
        if (validados.data.moneda === "USD") {
          const tipo = tipoDeDolar ?? "oficial";
          const resultado = await dolar.cotizacion(tipo);
          if (!resultado.ok) return resultado;
          cotizacion = { tipoDeDolar: tipo, valor: valorDeCotizacion(validados.data.tipo, resultado.cotizacion) };
        }
        return { ok: true, movimiento: await movimientos.registrar(validados.data, cotizacion) };
      },
    }),

    consultar_movimientos: tool({
      description:
        "Los movimientos de la persona en un período (el más reciente primero), con ingresos, gastos y balance. Usala " +
        "para listar o sumar lo que registró, y para encontrar el id de uno que quiera borrar.",
      inputSchema: z.object({
        periodo: PeriodoSchema,
        tipo: z.enum(TIPOS_DE_MOVIMIENTO).optional().describe("Solo gastos o solo ingresos."),
        categoria: z.enum(TODAS_LAS_CATEGORIAS).optional().describe("Solo esa categoría."),
      }),
      execute: async ({ periodo: pedido, tipo, categoria }): Promise<MovimientosConsultados> => {
        const periodo = periodoPedido(pedido, hoy());
        if ("ok" in periodo) return periodo;
        // La categoría ya viene de la lista: si no corresponde al tipo, la consulta simplemente no trae nada.
        const lista = await movimientos.listar(periodo, { tipo, categoria: categoria as Movimiento["categoria"] });
        return { ok: true, periodo, movimientos: lista, resumen: resumen(lista) };
      },
    }),

    estadisticas: tool({
      description:
        "Estadísticas de un período: ingresos, gastos, balance, totales y porcentaje por categoría, promedio diario " +
        "de gastos y cuánto variaron los gastos contra el período anterior. Usala para '¿cómo vengo?', '¿en qué " +
        "gasto más?' o comparaciones.",
      inputSchema: z.object({ periodo: PeriodoSchema }),
      execute: async ({ periodo: pedido }): Promise<EstadisticasConsultadas> => {
        const periodo = periodoPedido(pedido, hoy());
        if ("ok" in periodo) return periodo;
        const [actuales, anteriores] = await Promise.all([
          movimientos.listar(periodo),
          movimientos.listar(periodoAnterior(periodo)),
        ]);
        return { ok: true, estadisticas: estadisticas(actuales, periodo, anteriores) };
      },
    }),

    borrar_movimiento: tool({
      description:
        "Borra un movimiento de la persona por su id (sacalo de consultar_movimientos). Antes de borrar, confirmá " +
        "con la persona cuál es (descripción, monto y fecha).",
      inputSchema: z.object({ id: z.uuid().describe("El id del movimiento.") }),
      execute: async ({ id }): Promise<MovimientoBorrado> =>
        (await movimientos.borrar(id))
          ? { ok: true }
          : { ok: false, motivo: "no_encontrado", detalle: "No hay un movimiento tuyo con ese id." },
    }),

    convertir: tool({
      description:
        "Convierte un monto entre pesos y dólares con la cotización actual (compra y venta). Usala para '¿cuánto son " +
        "100 dólares?' o '¿cuántos dólares compro con 500.000 pesos?'. No calcules conversiones vos.",
      inputSchema: z.object({
        monto: z.number().positive(),
        de: z.enum(MONEDAS).describe("La moneda del monto: se convierte a la otra."),
        tipoDeDolar: z.enum(TIPOS_DE_DOLAR).optional().describe("Sin valor: oficial."),
      }),
      execute: async ({ monto, de, tipoDeDolar = "oficial" }): Promise<Conversion> => {
        const resultado = await dolar.cotizacion(tipoDeDolar);
        if (!resultado.ok) return resultado;
        const { compra, venta, actualizada } = resultado.cotizacion;
        const convertir = (valor: number) =>
          de === "USD" ? montoEnPesos({ monto, moneda: "USD" }, { tipoDeDolar, valor }) : redondear(monto / valor);
        return {
          ok: true,
          monto,
          de,
          a: de === "USD" ? "ARS" : "USD",
          tipoDeDolar,
          conCompra: convertir(compra),
          conVenta: convertir(venta),
          actualizada,
        };
      },
    }),
  };
}

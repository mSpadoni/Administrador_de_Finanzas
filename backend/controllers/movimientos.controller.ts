import "server-only";
import { clienteDolar, type ClienteDolar } from "@/backend/lib/dolar";
import { estadisticas, resumen, type Estadisticas, type Resumen } from "@/backend/models/dominio/estadisticas";
import {
  DatosDeMovimientoSchema,
  montoEnPesos,
  valorDeCotizacion,
  type Categoria,
  type CotizacionUsada,
  type DatosDeMovimiento,
  type MedioDePago,
  type Moneda,
  type Movimiento,
  type TipoDeDolar,
  type TipoDeMovimiento,
} from "@/backend/models/dominio/movimiento";
import {
  hoyEnArgentina,
  periodoAnterior,
  periodoDe,
  resolverPeriodo,
  type PedidoDePeriodo,
  type Periodo,
} from "@/backend/models/dominio/periodo";
import { movimientosModel, type MovimientosModel } from "@/backend/models/repositorios/movimientos.model";
import { datosInvalidos, movimientoNoEncontrado, type FalloDeMovimientos } from "./erroresControllers";

/** Centavos por peso (o por dólar): los montos se redondean a dos decimales. */
const CENTAVOS_POR_UNIDAD = 100;

/** Lo que pide la persona al registrar un movimiento, tal como lo entiende el asistente (todavía sin validar). */
export type EntradaDeMovimiento = {
  tipo: TipoDeMovimiento;
  monto: number;
  moneda: Moneda;
  categoria: string;
  medioDePago: MedioDePago;
  descripcion: string;
  /** El día del movimiento (AAAA-MM-DD). Sin valor: hoy. */
  fecha?: string;
  /** Solo si es en dólares. Sin valor: oficial. */
  tipoDeDolar?: TipoDeDolar;
};

/** Qué movimientos consultar: un período (sin valor, el mes actual) y, si se quiere, solo un tipo o una categoría. */
export type ConsultaDeMovimientos = { periodo?: PedidoDePeriodo; tipo?: TipoDeMovimiento; categoria?: string };

export type MovimientoRegistrado = { ok: true; movimiento: Movimiento } | FalloDeMovimientos;
export type MovimientosConsultados =
  { ok: true; periodo: Periodo; movimientos: Movimiento[]; resumen: Resumen } | FalloDeMovimientos;
export type EstadisticasConsultadas = { ok: true; estadisticas: Estadisticas } | FalloDeMovimientos;
export type MovimientoBorrado = { ok: true } | FalloDeMovimientos;
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
  | FalloDeMovimientos;

const redondear = (valor: number) => Math.round(valor * CENTAVOS_POR_UNIDAD) / CENTAVOS_POR_UNIDAD;

/**
 * Casos de uso de los movimientos (gastos e ingresos): registrar, consultar, estadísticas, borrar y convertir. Es el
 * único que le dice al modelo qué guardar y qué leer: las tools del asistente y el panel «Este mes» le piden las cosas
 * a él y no conocen los modelos. Los números salen siempre de la base o de dolarapi, nunca del modelo de lenguaje.
 * Ningún caso de uso lanza por un dato mal pedido: devuelve `{ ok: false, motivo, detalle }` para que el asistente
 * lo corrija o se lo explique a la persona. Un error de la base sí se propaga.
 */
export class MovimientosController {
  constructor(
    private readonly modeloMovimientos: () => MovimientosModel = () => movimientosModel,
    private readonly dolar: ClienteDolar = clienteDolar,
    /** La fecha de hoy en Argentina (AAAA-MM-DD). */
    private readonly hoy: () => string = () => hoyEnArgentina(new Date())
  ) {}

  /**
   * Registra un gasto o un ingreso. Si es en dólares busca la cotización del día y guarda también el monto en pesos
   * (docs/adr/0001).
   */
  async registrar({ tipoDeDolar, fecha, ...entrada }: EntradaDeMovimiento): Promise<MovimientoRegistrado> {
    const validados = DatosDeMovimientoSchema.safeParse({ ...entrada, fecha: fecha ?? this.hoy() });
    if (!validados.success) return datosInvalidos(validados.error.issues[0]?.message ?? "Datos inválidos.");

    const cotizacion = await this.cotizacionDelDia(validados.data, tipoDeDolar ?? "oficial");
    if (!cotizacion.ok) return cotizacion;
    return { ok: true, movimiento: await this.modeloMovimientos().registrar(validados.data, cotizacion.usada) };
  }

  /** Los movimientos de un período (el más reciente primero), con ingresos, gastos y balance. */
  async consultar({ periodo: pedido, tipo, categoria }: ConsultaDeMovimientos): Promise<MovimientosConsultados> {
    const periodo = this.periodoPedido(pedido);
    if ("ok" in periodo) return periodo;
    // La categoría ya viene de la lista: si no corresponde al tipo, la consulta simplemente no trae nada.
    const lista = await this.modeloMovimientos().listar(periodo, { tipo, categoria: categoria as Categoria });
    return { ok: true, periodo, movimientos: lista, resumen: resumen(lista) };
  }

  /** Las estadísticas de un período (sin valor, el mes actual), comparadas con el período anterior. */
  async estadisticas(pedido?: PedidoDePeriodo): Promise<EstadisticasConsultadas> {
    const periodo = this.periodoPedido(pedido);
    if ("ok" in periodo) return periodo;
    return { ok: true, estadisticas: await this.estadisticasDe(periodo) };
  }

  /** Las estadísticas del mes en curso (las lee el panel «Este mes»). */
  estadisticasDelMes(): Promise<Estadisticas> {
    return this.estadisticasDe(periodoDe("mes", this.hoy()));
  }

  /** Borra un movimiento de la persona por su id. */
  async borrar(id: string): Promise<MovimientoBorrado> {
    return (await this.modeloMovimientos().borrar(id)) ? { ok: true } : movimientoNoEncontrado();
  }

  /** Convierte un monto entre pesos y dólares con la cotización actual (compra y venta). No modifica ningún movimiento. */
  async convertir(monto: number, de: Moneda, tipoDeDolar: TipoDeDolar = "oficial"): Promise<Conversion> {
    const resultado = await this.dolar.cotizacion(tipoDeDolar);
    if (!resultado.ok) return resultado;
    const { compra, venta, actualizada } = resultado.cotizacion;
    const convertirCon = (valor: number) =>
      de === "USD" ? montoEnPesos({ monto, moneda: "USD" }, { tipoDeDolar, valor }) : redondear(monto / valor);
    return {
      ok: true,
      monto,
      de,
      a: de === "USD" ? "ARS" : "USD",
      tipoDeDolar,
      conCompra: convertirCon(compra),
      conVenta: convertirCon(venta),
      actualizada,
    };
  }

  /** Las estadísticas de un período contra el anterior. */
  private async estadisticasDe(periodo: Periodo): Promise<Estadisticas> {
    const [actuales, anteriores] = await Promise.all([
      this.modeloMovimientos().listar(periodo),
      this.modeloMovimientos().listar(periodoAnterior(periodo)),
    ]);
    return estadisticas(actuales, periodo, anteriores);
  }

  /** La cotización con la que se pasa a pesos el movimiento (ninguna si es en pesos), o por qué no se pudo buscar. */
  private async cotizacionDelDia(
    datos: DatosDeMovimiento,
    tipoDeDolar: TipoDeDolar
  ): Promise<{ ok: true; usada: CotizacionUsada | null } | FalloDeMovimientos> {
    if (datos.moneda !== "USD") return { ok: true, usada: null };
    const resultado = await this.dolar.cotizacion(tipoDeDolar);
    if (!resultado.ok) return resultado;
    return { ok: true, usada: { tipoDeDolar, valor: valorDeCotizacion(datos.tipo, resultado.cotizacion) } };
  }

  /** El período pedido (sin valor, el mes actual), o por qué no se puede armar (ej. un rango al revés). */
  private periodoPedido(pedido: PedidoDePeriodo | undefined): Periodo | FalloDeMovimientos {
    try {
      return resolverPeriodo(pedido ?? {}, this.hoy());
    } catch (error) {
      return datosInvalidos(error instanceof Error ? error.message : "El período no es válido.");
    }
  }
}

/** Instancia lista para usar desde las tools y las páginas (con el cliente del request). */
export const movimientosController = new MovimientosController();

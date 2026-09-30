import "server-only";
import { datosOError } from "@/backend/lib/supabase/consultas";
import { crearClienteServidor, type ClienteSupabase } from "@/backend/lib/supabase/server";
import {
  montoEnPesos,
  TIPOS_DE_DOLAR,
  type Categoria,
  type CotizacionUsada,
  type DatosDeMovimiento,
  type Movimiento,
  type TipoDeMovimiento,
} from "@/backend/models/dominio/movimiento";
import type { Periodo } from "@/backend/models/dominio/periodo";
import { DatosDeMovimientoSchema } from "@/backend/models/dominio/validacionDominio";
import type { Database } from "@/backend/types/database";

type FilaMovimiento = Database["public"]["Tables"]["movimientos"]["Row"];

/** Qué movimientos listar además del período (sin filtro: todos). */
export type FiltroDeMovimientos = { tipo?: TipoDeMovimiento; categoria?: Categoria };

/**
 * La fila como Movimiento del dominio, validada. La base ya tiene los check, pero una fila que no pasa la validación
 * (cargada a mano, o de una versión vieja) se omite con un aviso en vez de romper una consulta entera.
 */
function aMovimiento(fila: FilaMovimiento): Movimiento | null {
  const datos = DatosDeMovimientoSchema.safeParse({
    tipo: fila.tipo,
    monto: fila.monto,
    moneda: fila.moneda,
    categoria: fila.categoria,
    medioDePago: fila.medio_de_pago,
    descripcion: fila.descripcion,
    fecha: fila.fecha,
  });
  if (!datos.success) {
    console.warn(`Movimiento ${fila.id} inválido: se omite.`, datos.error.issues[0]?.message);
    return null;
  }
  return {
    ...datos.data,
    id: fila.id,
    montoEnPesos: fila.monto_en_pesos,
    cotizacion: cotizacionDeLaFila(fila),
  };
}

/** La cotización con la que se pasó a pesos el movimiento, o null si es en pesos. */
function cotizacionDeLaFila(fila: FilaMovimiento): CotizacionUsada | null {
  const tipoDeDolar = TIPOS_DE_DOLAR.find((tipo) => tipo === fila.tipo_de_dolar);
  return tipoDeDolar && fila.cotizacion !== null ? { tipoDeDolar, valor: fila.cotizacion } : null;
}

/**
 * Acceso a la tabla movimientos. No filtra por persona a mano: las políticas RLS ya limitan todo a la persona
 * logueada (y la base rechaza lo que no cumple sus check).
 */
export class MovimientosModel {
  constructor(private readonly crearCliente: () => Promise<ClienteSupabase> = crearClienteServidor) {}

  /**
   * Valida el movimiento y lo guarda a nombre de la persona logueada. `cotizacion`: la del día con la que se pasa a
   * pesos un movimiento en dólares (null si es en pesos). El monto en pesos queda fijo (docs/adr/0001).
   */
  async registrar(datos: DatosDeMovimiento, cotizacion: CotizacionUsada | null): Promise<Movimiento> {
    const movimiento = DatosDeMovimientoSchema.parse(datos);
    const enPesos = montoEnPesos(movimiento, cotizacion);
    const supabase = await this.crearCliente();
    const fila = datosOError(
      await supabase
        .from("movimientos")
        .insert({
          tipo: movimiento.tipo,
          monto: movimiento.monto,
          moneda: movimiento.moneda,
          monto_en_pesos: enPesos,
          tipo_de_dolar: cotizacion?.tipoDeDolar ?? null,
          cotizacion: cotizacion?.valor ?? null,
          categoria: movimiento.categoria,
          medio_de_pago: movimiento.medioDePago,
          descripcion: movimiento.descripcion,
          fecha: movimiento.fecha,
        })
        .select("id")
        .single(),
      "No se pudo registrar el movimiento"
    );
    return { ...movimiento, id: fila.id, montoEnPesos: enPesos, cotizacion };
  }

  /** Los movimientos del período (extremos incluidos), el más reciente primero, con el filtro opcional. */
  async listar(periodo: Periodo, { tipo, categoria }: FiltroDeMovimientos = {}): Promise<Movimiento[]> {
    const supabase = await this.crearCliente();
    let consulta = supabase.from("movimientos").select("*").gte("fecha", periodo.desde).lte("fecha", periodo.hasta);
    if (tipo) consulta = consulta.eq("tipo", tipo);
    if (categoria) consulta = consulta.eq("categoria", categoria);
    const filas = datosOError(
      await consulta.order("fecha", { ascending: false }).order("creado_en", { ascending: false }),
      "No se pudieron leer los movimientos"
    );
    return filas.flatMap((fila) => aMovimiento(fila) ?? []);
  }

  /** Borra un movimiento de la persona. true si lo borró; false si no existe o es de otra persona (RLS). */
  async borrar(id: string): Promise<boolean> {
    const supabase = await this.crearCliente();
    const borrados = datosOError(
      await supabase.from("movimientos").delete().eq("id", id).select("id"),
      "No se pudo borrar el movimiento"
    );
    return borrados.length > 0;
  }
}

/** Instancia lista para usar desde la app (con el cliente del request). */
export const movimientosModel = new MovimientosModel();

import { isStaticToolUIPart } from "ai";
import type { EstadisticasDelPeriodo, MovimientoGuardado, ParteDelAsistente, ResultadoExitoso } from "@/shared/chat";
import {
  fechaCorta,
  formatoMonto,
  formatoPesos,
  formatoPorcentaje,
  horaDeActualizacion,
  nombreDeCategoria,
  nombreDelMedioDePago,
  nombreDelTipoDeDolar,
  textoDeVariacion,
} from "./formato";

// Lo que ve la persona cuando el asistente usa una tool: una tarjeta con el detalle, una tabla, barras por categoría
// o la cotización. Los números salen del resultado de la tool (de la base o de dolarapi), nunca del texto del modelo.
// Cada tarjeta es una región con nombre (aria-label) y el estado va siempre con texto, no solo con color o forma.

/** Máximo de filas que muestra la tabla en el chat; el resto se avisa (el detalle completo lo cuenta el asistente). */
export const MAX_FILAS_EN_TABLA = 15;

const tarjeta = "my-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900";

/** El movimiento que acaba de registrar el asistente. */
export function TarjetaDeMovimiento({ movimiento }: { movimiento: MovimientoGuardado }) {
  const esGasto = movimiento.tipo === "gasto";
  return (
    <article aria-label="Movimiento registrado" className={tarjeta}>
      <p className="flex items-center justify-between gap-2 font-semibold">
        <span>
          <span aria-hidden="true">✓ </span>
          {esGasto ? "Gasto registrado" : "Ingreso registrado"}
        </span>
        <span className={esGasto ? "text-red-800" : "text-green-800"}>
          {esGasto ? "− " : "+ "}
          {formatoMonto(movimiento.monto, movimiento.moneda)}
        </span>
      </p>
      <p className="mt-1">{movimiento.descripcion}</p>
      {movimiento.cotizacion && (
        <p className="mt-1 text-slate-700">
          Equivale a {formatoPesos(movimiento.montoEnPesos)} (dólar{" "}
          {nombreDelTipoDeDolar(movimiento.cotizacion.tipoDeDolar).toLowerCase()} a{" "}
          {formatoPesos(movimiento.cotizacion.valor)})
        </p>
      )}
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
        <div className="flex gap-1">
          <dt className="font-medium">Categoría:</dt>
          <dd>{nombreDeCategoria(movimiento.categoria)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="font-medium">Medio de pago:</dt>
          <dd>{nombreDelMedioDePago(movimiento.medioDePago)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="font-medium">Fecha:</dt>
          <dd>{fechaCorta(movimiento.fecha)}</dd>
        </div>
      </dl>
    </article>
  );
}

/** Los movimientos de un período en una tabla, con el resumen de ingresos, gastos y balance. */
export function TablaDeMovimientos({ datos }: { datos: ResultadoExitoso<"consultar_movimientos"> }) {
  const { periodo, movimientos, resumen } = datos;
  const visibles = movimientos.slice(0, MAX_FILAS_EN_TABLA);
  const titulo = `Movimientos del ${fechaCorta(periodo.desde)} al ${fechaCorta(periodo.hasta)}`;
  return (
    <section aria-label={titulo} className={tarjeta}>
      {movimientos.length === 0 ? (
        <p>{titulo}: no hay movimientos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <caption className="pb-2 text-left font-semibold">{titulo}</caption>
            <thead>
              <tr className="border-b border-slate-300">
                <th scope="col" className="py-1 pr-2 font-semibold">
                  Fecha
                </th>
                <th scope="col" className="py-1 pr-2 font-semibold">
                  Descripción
                </th>
                <th scope="col" className="py-1 pr-2 font-semibold">
                  Categoría
                </th>
                <th scope="col" className="py-1 text-right font-semibold">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((m) => (
                <tr key={m.id} className="border-b border-slate-200 last:border-0">
                  <td className="py-1 pr-2 whitespace-nowrap">{fechaCorta(m.fecha)}</td>
                  <td className="py-1 pr-2">{m.descripcion}</td>
                  <td className="py-1 pr-2">{nombreDeCategoria(m.categoria)}</td>
                  <td className="py-1 text-right whitespace-nowrap tabular-nums">
                    <span className="sr-only">{m.tipo === "gasto" ? "Gasto de " : "Ingreso de "}</span>
                    <span aria-hidden="true">{m.tipo === "gasto" ? "− " : "+ "}</span>
                    {formatoPesos(m.montoEnPesos)}
                    {m.moneda === "USD" && (
                      <span className="block text-xs text-slate-600">{formatoMonto(m.monto, "USD")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {movimientos.length > visibles.length && (
        <p className="mt-1 text-xs text-slate-700">Y {movimientos.length - visibles.length} más en este período.</p>
      )}
      <ResumenDeMontos resumen={resumen} />
    </section>
  );
}

/** Ingresos, gastos y balance (en pesos). */
function ResumenDeMontos({ resumen }: { resumen: EstadisticasDelPeriodo["resumen"] }) {
  return (
    <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-200 pt-2 text-xs sm:text-sm">
      <div>
        <dt className="text-slate-700">Ingresos</dt>
        <dd className="font-semibold text-green-800">{formatoPesos(resumen.ingresos)}</dd>
      </div>
      <div>
        <dt className="text-slate-700">Gastos</dt>
        <dd className="font-semibold text-red-800">{formatoPesos(resumen.gastos)}</dd>
      </div>
      <div>
        <dt className="text-slate-700">Balance</dt>
        <dd className="font-semibold">{formatoPesos(resumen.balance)}</dd>
      </div>
    </dl>
  );
}

/** Las barras de los gastos por categoría: el ancho es el porcentaje, y el número va siempre escrito al lado. */
export function BarrasDeCategorias({ porCategoria }: { porCategoria: EstadisticasDelPeriodo["porCategoria"] }) {
  const gastos = porCategoria.filter((c) => c.tipo === "gasto");
  if (gastos.length === 0) return <p className="mt-2 text-xs text-slate-700">No hubo gastos en este período.</p>;
  return (
    <ul aria-label="Gastos por categoría" className="mt-2 space-y-2">
      {gastos.map((c) => (
        <li key={c.categoria}>
          <p className="flex justify-between gap-2 text-xs sm:text-sm">
            <span>{nombreDeCategoria(c.categoria)}</span>
            <span className="whitespace-nowrap">
              {formatoPesos(c.total)} · {formatoPorcentaje(c.porcentaje)}
            </span>
          </p>
          {/* La barra es solo un refuerzo visual: la información está en el texto de arriba. */}
          <div aria-hidden="true" className="mt-0.5 h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-blue-700"
              style={{ width: `${Math.min(100, Math.max(2, c.porcentaje))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Las estadísticas de un período: resumen, promedio diario, variación y barras por categoría. */
export function TarjetaDeEstadisticas({ estadisticas }: { estadisticas: EstadisticasDelPeriodo }) {
  const { periodo, resumen, porCategoria, promedioDiarioDeGastos, variacionDeGastos } = estadisticas;
  const titulo = `Estadísticas del ${fechaCorta(periodo.desde)} al ${fechaCorta(periodo.hasta)}`;
  return (
    <section aria-label={titulo} className={tarjeta}>
      <h3 className="font-semibold">{titulo}</h3>
      <ResumenDeMontos resumen={resumen} />
      <p className="mt-2 text-xs text-slate-700 sm:text-sm">
        Promedio diario de gastos: {formatoPesos(promedioDiarioDeGastos)}.{" "}
        {textoDeVariacion(variacionDeGastos.porcentaje)}.
      </p>
      <BarrasDeCategorias porCategoria={porCategoria} />
    </section>
  );
}

/** La cotización de cada tipo de dólar pedido: compra, venta y cuándo se actualizó. */
export function TarjetaDeCotizacion({
  cotizaciones,
}: {
  cotizaciones: ResultadoExitoso<"cotizacion_dolar">["cotizaciones"];
}) {
  if (cotizaciones.length === 0) return null;
  return (
    <section aria-label="Cotización del dólar" className={tarjeta}>
      <ul className="space-y-2">
        {cotizaciones.map((c) => (
          <li key={c.tipoDeDolar} className="flex flex-wrap items-baseline justify-between gap-x-4">
            <span className="font-semibold">Dólar {nombreDelTipoDeDolar(c.tipoDeDolar).toLowerCase()}</span>
            <span>
              Compra {formatoPesos(c.compra)} · Venta {formatoPesos(c.venta)}
            </span>
            <span className="w-full text-xs text-slate-700">Actualizada el {horaDeActualizacion(c.actualizada)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-700">Fuente: dolarapi.com</p>
    </section>
  );
}

/** Lo que da una conversión de pesos a dólares (o al revés) con la cotización del día. */
export function TarjetaDeConversion({ conversion }: { conversion: ResultadoExitoso<"convertir"> }) {
  const { monto, de, a, tipoDeDolar, conCompra, conVenta, actualizada } = conversion;
  return (
    <section aria-label="Conversión" className={tarjeta}>
      <p className="font-semibold">
        {formatoMonto(monto, de)} en dólar {nombreDelTipoDeDolar(tipoDeDolar).toLowerCase()}
      </p>
      <p className="mt-1">
        Con la cotización de compra: {formatoMonto(conCompra, a)} · con la de venta: {formatoMonto(conVenta, a)}
      </p>
      <p className="mt-1 text-xs text-slate-700">
        Cotización actualizada el {horaDeActualizacion(actualizada)} · Fuente: dolarapi.com
      </p>
    </section>
  );
}

/**
 * La tarjeta que corresponde al resultado de una tool, o nada: mientras la tool trabaja, si falló o si no tiene nada
 * para mostrar (borrar un movimiento) alcanza con el aviso de estado de arriba y el texto del asistente.
 */
export function ResultadoDeTool({ parte }: { parte: ParteDelAsistente }) {
  if (!isStaticToolUIPart(parte) || parte.state !== "output-available") return null;
  switch (parte.type) {
    case "tool-registrar_movimiento":
      return parte.output.ok ? <TarjetaDeMovimiento movimiento={parte.output.movimiento} /> : null;
    case "tool-consultar_movimientos":
      return parte.output.ok ? <TablaDeMovimientos datos={parte.output} /> : null;
    case "tool-estadisticas":
      return parte.output.ok ? <TarjetaDeEstadisticas estadisticas={parte.output.estadisticas} /> : null;
    case "tool-cotizacion_dolar":
      return parte.output.ok ? <TarjetaDeCotizacion cotizaciones={parte.output.cotizaciones} /> : null;
    case "tool-convertir":
      return parte.output.ok ? <TarjetaDeConversion conversion={parte.output} /> : null;
    default:
      return null;
  }
}

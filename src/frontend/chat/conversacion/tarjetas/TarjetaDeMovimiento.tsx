import type { MovimientoGuardado } from "@/shared/chat";
import {
  fechaCorta,
  formatoMonto,
  formatoPesos,
  nombreDeCategoria,
  nombreDelMedioDePago,
  nombreDelTipoDeDolar,
} from "../../compartidos/formato";
import { tarjeta } from "./estilos";

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
        <span className={esGasto ? "text-peligro" : "text-ingreso"}>
          {esGasto ? "− " : "+ "}
          {formatoMonto(movimiento.monto, movimiento.moneda)}
        </span>
      </p>
      <p className="mt-1">{movimiento.descripcion}</p>
      {movimiento.cotizacion && (
        <p className="mt-1 text-tinta-suave">
          Equivale a {formatoPesos(movimiento.montoEnPesos)} (dólar{" "}
          {nombreDelTipoDeDolar(movimiento.cotizacion.tipoDeDolar).toLowerCase()} a{" "}
          {formatoPesos(movimiento.cotizacion.valor)})
        </p>
      )}
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-suave">
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

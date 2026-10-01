import type { EstadisticasDelPeriodo } from "@/shared/chat";
import { fechaCorta, formatoPesos, textoDeVariacion } from "../../../compartidos/formato";
import { tarjeta } from "../estilos";
import { BarrasDeCategorias } from "./BarrasDeCategorias";
import ResumenDeMontos from "../ResumenDeMontos";

/** Las estadísticas de un período: resumen, promedio diario, variación y barras por categoría. */
export function TarjetaDeEstadisticas({ estadisticas }: { estadisticas: EstadisticasDelPeriodo }) {
  const { periodo, resumen, porCategoria, promedioDiarioDeGastos, variacionDeGastos } = estadisticas;
  const titulo = `Estadísticas del ${fechaCorta(periodo.desde)} al ${fechaCorta(periodo.hasta)}`;
  return (
    <section aria-label={titulo} className={tarjeta}>
      <h3 className="font-semibold">{titulo}</h3>
      <ResumenDeMontos resumen={resumen} />
      <p className="mt-2 text-xs text-tinta-suave sm:text-sm">
        Promedio diario de gastos: {formatoPesos(promedioDiarioDeGastos)}.{" "}
        {textoDeVariacion(variacionDeGastos.porcentaje)}.
      </p>
      <BarrasDeCategorias porCategoria={porCategoria} />
    </section>
  );
}

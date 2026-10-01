import { isStaticToolUIPart } from "ai";
import type { ParteDelAsistente } from "@/shared/chat";
import { TablaDeMovimientos } from "./TablaDeMovimientos";
import { TarjetaDeConversion } from "./TarjetaDeConversion";
import { TarjetaDeCotizacion } from "./TarjetaDeCotizacion";
import { TarjetaDeEstadisticas } from "./TarjetaDeEstadisticas";
import { TarjetaDeMovimiento } from "./TarjetaDeMovimiento";

// Lo que ve la persona cuando el asistente usa una tool: una tarjeta con el detalle, una tabla, barras por categoría
// o la cotización. Los números salen del resultado de la tool (de la base o de dolarapi), nunca del texto del modelo.
// Cada tarjeta es una región con nombre (aria-label) y el estado va siempre con texto, no solo con color o forma.
// Cada tarjeta está en su archivo de esta carpeta; acá se elige cuál mostrar.

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

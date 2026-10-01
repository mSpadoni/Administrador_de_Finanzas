import "server-only";
import { registrarError } from "@/backend/lib/registro";
import type { Estadisticas } from "@/backend/models/dominio/estadisticas";
import type { AsistenteUIMessage } from "@/shared/chat";
import type { ConversacionDelCostado } from "@/shared/conversaciones";
import { conversacionesServicio, type ConversacionesServicio } from "@/backend/servicios/conversaciones.servicio";
import { movimientosServicio, type MovimientosServicio } from "@/backend/servicios/movimientos.servicio";

/** Todo lo que necesita la pantalla del chat para dibujarse. */
export type DatosDeLaPantalla = {
  /** Las conversaciones de la barra lateral, la más reciente arriba. */
  conversaciones: ConversacionDelCostado[];
  /** El historial de la conversación abierta (vacío si todavía no se guardó ningún mensaje). */
  mensajes: AsistenteUIMessage[];
  /** El resumen del mes para el panel «Este mes»; `null` si no se pudo leer (el chat igual funciona). */
  estadisticasDelMes: Estadisticas | null;
};

/**
 * El caso de uso de abrir la pantalla del chat: junta en una sola lectura lo que hoy llega de tres lados (la lista del
 * costado, la conversación y el resumen del mes), para que la ruta no tenga que saber de dónde sale cada cosa. Usa los
 * servicios de conversaciones y de movimientos (un controller no llama a otro controller). El id ya viene validado por la
 * página.
 */
export class PantallaController {
  constructor(
    private readonly conversaciones: () => ConversacionesServicio = () => conversacionesServicio,
    private readonly movimientos: () => MovimientosServicio = () => movimientosServicio
  ) {}

  /** Lee lo que necesita la pantalla de la conversación `id`. Las tres lecturas van a la vez. */
  async abrir(id: string): Promise<DatosDeLaPantalla> {
    const [guardadas, abierta, estadisticasDelMes] = await Promise.all([
      this.conversaciones().listar(),
      this.conversaciones().abrir(id),
      this.estadisticasDelMesONull(),
    ]);
    // Al navegador solo viajan el id y el título: el resto de las columnas (fechas) no hace falta para dibujar el costado.
    const conversaciones = guardadas.map(({ id, titulo }) => ({ id, titulo }));
    return { conversaciones, mensajes: abierta.mensajes, estadisticasDelMes };
  }

  /** El resumen del mes, o `null` si falla: el panel avisa que no pudo cargarlo y el chat sigue funcionando. */
  private estadisticasDelMesONull(): Promise<Estadisticas | null> {
    return this.movimientos()
      .estadisticasDelMes()
      .catch((error: unknown) => {
        registrarError("pantalla.resumen_del_mes", error);
        return null;
      });
  }
}

/** Instancia lista para usar desde la página de la conversación. */
export const pantallaController = new PantallaController();

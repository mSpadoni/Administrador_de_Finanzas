import type { ResultadoCotizaciones } from "./cotizaciones";

/**
 * La memoria de las cotizaciones: guarda el último pedido (en curso o terminado bien) y lo reutiliza mientras sea reciente.
 * Los pedidos que fallaron no se guardan: la próxima consulta vuelve a intentar.
 */
export class CacheDeCotizaciones {
  private guardado: { desde: number; resultado: Promise<ResultadoCotizaciones> } | null = null;

  /**
   * @param duracionMs cuánto se reutiliza un pedido antes de volver a hacerlo (ms)
   * @param reloj la hora actual en ms (los tests la controlan)
   */
  constructor(
    private readonly duracionMs: number,
    private readonly reloj: () => number
  ) {}

  /** El pedido guardado si sigue vigente; si no, hace uno nuevo con `pedir` y lo guarda. */
  obtener(pedir: () => Promise<ResultadoCotizaciones>): Promise<ResultadoCotizaciones> {
    const ahora = this.reloj();
    if (this.guardado && ahora - this.guardado.desde <= this.duracionMs) return this.guardado.resultado;

    const resultado = pedir();
    const entrada = { desde: ahora, resultado };
    this.guardado = entrada;
    // Si falló, se olvida (salvo que ya lo haya reemplazado otro pedido): la próxima consulta vuelve a intentar.
    void resultado.then((r) => {
      if (!r.ok && this.guardado === entrada) this.guardado = null;
    });
    return resultado;
  }
}

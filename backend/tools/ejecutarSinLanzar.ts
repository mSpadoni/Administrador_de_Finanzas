import "server-only";
import { registrarError } from "@/backend/lib/registro";
import { falloInternoDeLaTool, type FalloInternoDeLaTool } from "./erroresTools";

/**
 * Envuelve el `execute` de una tool para que nunca lance. Si lo que hace la tool falla por dentro (se cae la base, un bug),
 * el error queda en el log y la tool devuelve `{ ok: false, motivo: "error_interno" }`: el modelo se lo explica a la persona
 * y la respuesta sigue. Sin esto, el error subía al AI SDK y se mostraba como «el asistente no está disponible».
 * `nombre`: el nombre de la tool, para el log.
 */
export function ejecutarSinLanzar<Entrada, Resultado>(
  nombre: string,
  ejecutar: (entrada: Entrada) => Promise<Resultado>
): (entrada: Entrada) => Promise<Resultado | FalloInternoDeLaTool> {
  return async (entrada) => {
    try {
      return await ejecutar(entrada);
    } catch (error) {
      registrarError(`tool.${nombre}`, error);
      return falloInternoDeLaTool();
    }
  };
}

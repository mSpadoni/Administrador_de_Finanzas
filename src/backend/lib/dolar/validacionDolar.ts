import "server-only";
import { z } from "zod";

// Todas las validaciones con Zod de backend/lib/dolar: lo que responde dolarapi.com (/v1/dolares).

/** La respuesta es una lista de casas de cambio; de cada una, acá solo importa cómo se llama. */
const ListaDeCasasSchema = z.array(z.looseObject({ casa: z.string() }));

/**
 * Una casa que usa la app: se valida todo lo que se muestra, así una cotización rara no llega a la persona. Las casas que
 * la app no usa (cripto, mayorista…) no se validan: si una viene rara, no tiene por qué romper las demás.
 */
const CasaSchema = z.object({
  casa: z.string(),
  compra: z.number().positive(),
  venta: z.number().positive(),
  fechaActualizacion: z.string(),
});

/** Una casa de cambio como la publica dolarapi, ya validada. */
type CasaDeDolarapi = z.infer<typeof CasaSchema>;

/** Las casas de la respuesta (cada una con su nombre y el resto sin validar), o null si no es una lista de casas. */
export function validarListaDeCasas(json: unknown): { casa: string }[] | null {
  const resultado = ListaDeCasasSchema.safeParse(json);
  return resultado.success ? resultado.data : null;
}

/** Una casa que usa la app, validada; null si le falta algo o tiene valores imposibles. */
export function validarCasa(casa: unknown): CasaDeDolarapi | null {
  const resultado = CasaSchema.safeParse(casa);
  return resultado.success ? resultado.data : null;
}

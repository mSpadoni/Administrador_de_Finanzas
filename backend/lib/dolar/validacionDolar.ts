import { z } from "zod";

// Todas las validaciones con Zod de backend/lib/dolar: lo que responde dolarapi.com (/v1/dolares).

/** Lo que responde dolarapi. Se valida todo lo que se usa: una cotización rara no llega al usuario. */
const RespuestaDeDolarapiSchema = z.array(
  z.object({
    casa: z.string(),
    compra: z.number().positive(),
    venta: z.number().positive(),
    fechaActualizacion: z.string(),
  })
);

/** Una casa de cambio como la publica dolarapi (incluye casas que la app no usa). */
export type CasaDeDolarapi = z.infer<typeof RespuestaDeDolarapiSchema>[number];

/** Las casas de la respuesta de dolarapi, o null si lo que llegó no tiene la forma esperada. */
export function validarRespuestaDeDolarapi(json: unknown): CasaDeDolarapi[] | null {
  const resultado = RespuestaDeDolarapiSchema.safeParse(json);
  return resultado.success ? resultado.data : null;
}

import "server-only";
import type { LanguageModelUsage, TextStreamPart, ToolSet } from "ai";
import type { MedicionDeHerramienta, MetadatosDeRespuesta } from "@/shared/chat";

// Lo que se mide de cada respuesta mientras llega (modelo, tools, tokens, demora) para mostrárselo a la persona.

/** Suma los tokens de un paso a los de antes (el proveedor puede no informar alguno: cuenta como 0). */
function sumarTokens(antes: NonNullable<MetadatosDeRespuesta["tokens"]>, uso: LanguageModelUsage) {
  return {
    entrada: (antes.entrada ?? 0) + (uso.inputTokens ?? 0),
    salida: (antes.salida ?? 0) + (uso.outputTokens ?? 0),
    total: (antes.total ?? 0) + (uso.totalTokens ?? 0),
  };
}

/**
 * Mide la respuesta mientras llega, para mostrarle a la persona qué hizo el asistente: el modelo, cuánto tardó cada tool,
 * los tokens gastados y la demora total.
 *
 * El modelo no manda la respuesta de una vez: manda una secuencia de eventos ("empezó", "llamó a una tool", "la tool
 * devolvió", "terminó un paso", "terminó todo"...). Esta función devuelve OTRA función, que el stream llama con cada evento y
 * que contesta con los datos que corresponden a ese evento (o `undefined` si el evento no aporta nada). Se hace así,
 * devolviendo una función, para que lo que se va juntando (pasos, tokens, cuándo empezó cada tool) quede guardado
 * adentro y siga sumando de un evento al siguiente. El navegador junta todo lo que va contestando en `message.metadata`.
 * `reloj` es la hora actual en ms (los tests la controlan).
 */
export function medidorDeRespuesta(modelo: string, inicio = Date.now(), reloj: () => number = Date.now) {
  let pasos = 0;
  let tokens: NonNullable<MetadatosDeRespuesta["tokens"]> = {};
  const inicioDeCadaTool = new Map<string, number>();
  const herramientas: MedicionDeHerramienta[] = [];

  return (evento: TextStreamPart<ToolSet>): MetadatosDeRespuesta | undefined => {
    switch (evento.type) {
      case "start":
        return { modelo };
      case "tool-call":
        inicioDeCadaTool.set(evento.toolCallId, reloj());
        return undefined;
      case "tool-result":
      case "tool-error": {
        const empezo = inicioDeCadaTool.get(evento.toolCallId) ?? reloj();
        herramientas.push({ id: evento.toolCallId, nombre: evento.toolName, ms: reloj() - empezo });
        return { herramientas: [...herramientas] };
      }
      case "finish-step":
        pasos += 1;
        tokens = sumarTokens(tokens, evento.usage);
        return { pasos, modelo: evento.response.modelId || modelo, tokens };
      case "finish":
        return { ms: reloj() - inicio, tokens: sumarTokens({}, evento.totalUsage) };
      default:
        return undefined;
    }
  };
}

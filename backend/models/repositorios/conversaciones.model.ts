import "server-only";
import type { UIMessage } from "ai";
import type { AsistenteUIMessage } from "@/shared/chat";
import { datosOError } from "@/backend/lib/supabase/consultas";
import { crearClienteServidor, type ClienteSupabase } from "@/backend/lib/supabase/server";
import type { Database, Json } from "@/backend/types/database";
import { lanzarFalloAlCrearConversacion } from "./erroresRepositorios";

type FilaConversacion = Database["public"]["Tables"]["conversaciones"]["Row"];

/** Una conversación del usuario, para listarla (sin mensajes). */
export type ConversacionGuardada = Pick<FilaConversacion, "id" | "titulo" | "creado_en" | "actualizado_en">;

/** Las columnas de ConversacionGuardada, para pedir siempre las mismas. */
const COLUMNAS_CONVERSACION = "id, titulo, creado_en, actualizado_en";

/** Largo máximo del título (el mismo límite que pone la base). */
export const MAX_CARACTERES_TITULO = 120;

/** El título como lo acepta la base: nunca más largo que su límite. */
const tituloParaLaBase = (titulo: string) => titulo.slice(0, MAX_CARACTERES_TITULO);

/** El rol de un mensaje: en la base se guarda en español y el AI SDK lo llama user/assistant. */
const rolDelMensaje = (rol: AsistenteUIMessage["role"]): "usuario" | "asistente" =>
  rol === "user" ? "usuario" : "asistente";
const rolDeLaFila = (rol: string): AsistenteUIMessage["role"] => (rol === "usuario" ? "user" : "assistant");

type Partes = AsistenteUIMessage["parts"];

/**
 * Las partes de un mensaje como las guarda la base. La columna es `jsonb` (Supabase la tipa como `Json` genérico) y las
 * partes son un objeto tipado con funciones a lo sumo opcionales: no hay conversión que el compilador pueda comprobar,
 * así que se hace acá, en un solo lugar. Lo que se guarda es lo que armó el propio servidor (el AI SDK).
 */
const partesParaLaBase = (partes: UIMessage["parts"]): NonNullable<Json> => partes as unknown as NonNullable<Json>;

/**
 * Las partes de un mensaje leídas de la base. Se confía en la forma (las guardó el propio servidor), pero si la columna
 * no es ni una lista (una fila cargada a mano, de una versión vieja) el mensaje se muestra vacío en vez de romper la pantalla.
 */
const partesDeLaFila = (json: Json): Partes => (Array.isArray(json) ? (json as unknown as Partes) : []);

/** Inserta los mensajes de la conversación (los que ya estaban, por id, se dejan como están). */
async function guardarMensajes(
  supabase: ClienteSupabase,
  conversacionId: string,
  mensajes: readonly UIMessage[]
): Promise<void> {
  // Cada mensaje con 1 ms de diferencia: así el orden queda fijo aunque se guarden en el mismo insert.
  const ahora = Date.now();
  // upsert con ignoreDuplicates = "insertá, y si ya existe ese id, no hagas nada": al reintentar después de un
  // error, el navegador vuelve a mandar el mismo mensaje del usuario y no tiene que quedar dos veces.
  const guardado = await supabase.from("mensajes").upsert(
    mensajes.map((mensaje, i) => ({
      id: mensaje.id,
      conversacion_id: conversacionId,
      rol: rolDelMensaje(mensaje.role),
      partes: partesParaLaBase(mensaje.parts),
      creado_en: new Date(ahora + i).toISOString(),
    })),
    { onConflict: "conversacion_id,id", ignoreDuplicates: true }
  );
  datosOError(guardado, "No se pudieron guardar los mensajes");
}

/** Marca la conversación como la más reciente (sube en la lista del costado). */
async function marcarActividad(supabase: ClienteSupabase, conversacionId: string): Promise<void> {
  datosOError(
    await supabase.from("conversaciones").update({ actualizado_en: new Date().toISOString() }).eq("id", conversacionId),
    "No se pudo actualizar la conversación"
  );
}

/**
 * Acceso a las tablas conversaciones y mensajes.
 * No filtra por usuario a mano: las políticas RLS ya limitan todo al usuario logueado.
 * Los mensajes se guardan con el formato del Vercel AI SDK (UIMessage): rol + partes.
 */
export class ConversacionesModel {
  // El cliente de Supabase entra por el constructor: la app usa el del request; los tests, uno de prueba.
  constructor(private readonly crearCliente: () => Promise<ClienteSupabase> = crearClienteServidor) {}

  /** Crea una conversación del usuario logueado con el id que generó el navegador. Si ese id ya existe, lanza ConversacionYaExisteError. */
  async crear(id: string, titulo: string): Promise<ConversacionGuardada> {
    const supabase = await this.crearCliente();
    try {
      return datosOError(
        await supabase
          .from("conversaciones")
          .insert({ id, titulo: tituloParaLaBase(titulo) })
          .select(COLUMNAS_CONVERSACION)
          .single(),
        "No se pudo crear la conversación"
      );
    } catch (error) {
      // Si el id ya existe (es de otra persona: RLS no la deja ver), ConversacionYaExisteError; si no, el error tal cual.
      return lanzarFalloAlCrearConversacion(error);
    }
  }

  /** La conversación con ese id, o null si no existe o es de otro usuario (RLS la oculta). */
  async obtener(id: string): Promise<ConversacionGuardada | null> {
    const supabase = await this.crearCliente();
    return datosOError(
      await supabase.from("conversaciones").select(COLUMNAS_CONVERSACION).eq("id", id).maybeSingle(),
      "No se pudo leer la conversación"
    );
  }

  /** Las conversaciones del usuario, la más reciente arriba. */
  async listar(limite = 30): Promise<ConversacionGuardada[]> {
    const supabase = await this.crearCliente();
    return datosOError(
      await supabase
        .from("conversaciones")
        .select(COLUMNAS_CONVERSACION)
        .order("actualizado_en", { ascending: false })
        .limit(limite),
      "No se pudieron leer las conversaciones"
    );
  }

  /**
   * Los últimos `limite` mensajes de la conversación, en orden (el más viejo primero),
   * en el formato del AI SDK: "usuario" → user y "asistente" → assistant.
   */
  async mensajes(conversacionId: string, limite = 200): Promise<AsistenteUIMessage[]> {
    const supabase = await this.crearCliente();
    // Se piden los más nuevos primero (para quedarse con los últimos) y después se da vuelta la lista.
    const filas = datosOError(
      await supabase
        .from("mensajes")
        .select("id, rol, partes")
        .eq("conversacion_id", conversacionId)
        .order("creado_en", { ascending: false })
        .limit(limite),
      "No se pudieron leer los mensajes"
    );
    return filas.reverse().map((fila): AsistenteUIMessage => ({
      id: fila.id,
      role: rolDeLaFila(fila.rol),
      parts: partesDeLaFila(fila.partes),
    }));
  }

  /** Guarda mensajes en la conversación y la marca como la más reciente. */
  async agregarMensajes(conversacionId: string, mensajes: readonly UIMessage[]): Promise<void> {
    if (mensajes.length === 0) return;
    const supabase = await this.crearCliente();
    await guardarMensajes(supabase, conversacionId, mensajes);
    await marcarActividad(supabase, conversacionId);
  }

  /** Cambia el título de la conversación. Devuelve false si no existe o es de otro usuario (RLS no la deja tocar). */
  async actualizarTitulo(id: string, titulo: string): Promise<boolean> {
    const supabase = await this.crearCliente();
    const cambiadas = datosOError(
      await supabase
        .from("conversaciones")
        .update({ titulo: tituloParaLaBase(titulo) })
        .eq("id", id)
        .select("id"),
      "No se pudo cambiar el título de la conversación"
    );
    return cambiadas.length > 0;
  }

  /** Borra la conversación (y sus mensajes, en cascada). Devuelve false si no existía o era de otro usuario. */
  async borrar(id: string): Promise<boolean> {
    const supabase = await this.crearCliente();
    const borradas = datosOError(
      await supabase.from("conversaciones").delete().eq("id", id).select("id"),
      "No se pudo borrar la conversación"
    );
    return borradas.length > 0;
  }
}

/** Instancia lista para usar desde la app (con el cliente del request). */
export const conversacionesModel = new ConversacionesModel();

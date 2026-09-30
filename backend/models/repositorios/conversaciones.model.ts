import "server-only";
import type { UIMessage } from "ai";
import type { AsistenteUIMessage } from "@/shared/chat";
import { datosOError } from "@/backend/lib/supabase/consultas";
import type { UsoReciente } from "@/backend/models/dominio/limiteDeUso";
import { crearClienteServidor, type ClienteSupabase } from "@/backend/lib/supabase/server";
import type { Database, Json } from "@/backend/types/database";

type FilaConversacion = Database["public"]["Tables"]["conversaciones"]["Row"];

/** Una conversación del usuario, para listarla (sin mensajes). */
export type ConversacionGuardada = Pick<FilaConversacion, "id" | "titulo" | "creado_en" | "actualizado_en">;

/** Las columnas de ConversacionGuardada, para pedir siempre las mismas. */
const COLUMNAS_CONVERSACION = "id, titulo, creado_en, actualizado_en";

/** Largo máximo del título (el mismo límite que pone la base). */
export const MAX_CARACTERES_TITULO = 120;

/**
 * Acceso a las tablas conversaciones y mensajes.
 * No filtra por usuario a mano: las políticas RLS ya limitan todo al usuario logueado.
 * Los mensajes se guardan con el formato del Vercel AI SDK (UIMessage): rol + partes.
 */
export class ConversacionesModel {
  // El cliente de Supabase entra por el constructor: la app usa el del request; los tests, uno de prueba.
  constructor(private readonly crearCliente: () => Promise<ClienteSupabase> = crearClienteServidor) {}

  /** Crea una conversación del usuario logueado con el id que generó el navegador. */
  async crear(id: string, titulo: string): Promise<ConversacionGuardada> {
    const supabase = await this.crearCliente();
    return datosOError(
      await supabase
        .from("conversaciones")
        .insert({ id, titulo: titulo.slice(0, MAX_CARACTERES_TITULO) })
        .select(COLUMNAS_CONVERSACION)
        .single(),
      "No se pudo crear la conversación"
    );
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
      role: fila.rol === "usuario" ? "user" : "assistant",
      // jsonb sin tipo: se confía en lo que guardó el propio servidor (los mensajes que arma el AI SDK).
      parts: fila.partes as unknown as AsistenteUIMessage["parts"],
    }));
  }

  /** Guarda mensajes en la conversación y la marca como la más reciente. */
  async agregarMensajes(conversacionId: string, mensajes: readonly UIMessage[]): Promise<void> {
    if (mensajes.length === 0) return;
    const supabase = await this.crearCliente();
    // Cada mensaje con 1 ms de diferencia: así el orden queda fijo aunque se guarden en el mismo insert.
    const ahora = Date.now();
    // upsert con ignoreDuplicates = "insertá, y si ya existe ese id, no hagas nada": al reintentar después de un
    // error, el navegador vuelve a mandar el mismo mensaje del usuario y no tiene que quedar dos veces.
    const guardado = await supabase.from("mensajes").upsert(
      mensajes.map((mensaje, i) => ({
        id: mensaje.id,
        conversacion_id: conversacionId,
        rol: mensaje.role === "user" ? "usuario" : "asistente",
        partes: mensaje.parts as unknown as NonNullable<Json>,
        creado_en: new Date(ahora + i).toISOString(),
      })),
      { onConflict: "conversacion_id,id", ignoreDuplicates: true }
    );
    datosOError(guardado, "No se pudieron guardar los mensajes");

    datosOError(
      await supabase
        .from("conversaciones")
        .update({ actualizado_en: new Date().toISOString() })
        .eq("id", conversacionId),
      "No se pudo actualizar la conversación"
    );
  }

  /** Cambia el título de la conversación. Devuelve false si no existe o es de otro usuario (RLS no la deja tocar). */
  async actualizarTitulo(id: string, titulo: string): Promise<boolean> {
    const supabase = await this.crearCliente();
    const cambiadas = datosOError(
      await supabase
        .from("conversaciones")
        .update({ titulo: titulo.slice(0, MAX_CARACTERES_TITULO) })
        .eq("id", id)
        .select("id"),
      "No se pudo cambiar el título de la conversación"
    );
    return cambiadas.length > 0;
  }

  /**
   * Cuántos mensajes mandó el usuario logueado en el último minuto y en las últimas 24 horas (para el límite de uso).
   * RLS ya limita la cuenta a los mensajes de sus conversaciones. `head: true` pide solo la cantidad, sin las filas.
   */
  async usoReciente(ahora = new Date()): Promise<UsoReciente> {
    const supabase = await this.crearCliente();
    const mensajesDesde = async (milisegundosAtras: number): Promise<number> => {
      const respuesta = await supabase
        .from("mensajes")
        .select("id", { count: "exact", head: true })
        .eq("rol", "usuario")
        .gte("creado_en", new Date(ahora.getTime() - milisegundosAtras).toISOString());
      datosOError(respuesta, "No se pudieron contar los mensajes del usuario");
      return respuesta.count ?? 0; // con head: true, la cantidad viene en `count` (no en `data`)
    };
    // Las dos cuentas a la vez.
    const [ultimoMinuto, ultimoDia] = await Promise.all([mensajesDesde(60_000), mensajesDesde(86_400_000)]);
    return { ultimoMinuto, ultimoDia };
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

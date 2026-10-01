import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { envSupabase } from "@/backend/lib/env";
import type { Database } from "@/backend/types/database";

/**
 * Tipo del cliente de Supabase de esta app.
 * `SupabaseClient<Database>`: el `<...>` es un genérico; le dice al cliente qué tablas y columnas existen,
 * así el editor autocompleta `.from("conversaciones")` y avisa si escribís mal una columna.
 */
export type ClienteSupabase = SupabaseClient<Database>;

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Hay que crear uno por request: lee la sesión del usuario desde sus cookies,
 * así que las consultas pasan por las políticas RLS como ese usuario.
 */
export async function crearClienteServidor(): Promise<ClienteSupabase> {
  // cookies() primero: marca la página como dinámica antes de validar las variables de entorno.
  const cookieStore = await cookies();
  // Desestructuración: saca `url` y `key` del objeto que devuelve envSupabase().
  const { url, key } = envSupabase();

  // Se le explica a Supabase cómo leer y escribir cookies en Next.js, con dos funciones:
  return createServerClient<Database>(url, key, {
    cookies: {
      // getAll: le da a Supabase todas las cookies del request (ahí está la sesión del usuario).
      getAll() {
        return cookieStore.getAll();
      },
      // setAll: Supabase la llama cuando necesita guardar cookies nuevas (por ejemplo, al renovar la sesión).
      setAll(cookiesToSet) {
        try {
          // `({ name, value, options }) => ...`: función flecha que desestructura cada cookie de la lista.
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Desde un Server Component no se pueden escribir cookies.
          // No pasa nada: el middleware ya refresca la sesión en cada request.
        }
      },
    },
  });
}

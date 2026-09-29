import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { envSupabase } from "@/backend/lib/env";
import type { Database } from "@/backend/types/database";

/**
 * Refresca el token de sesión del usuario (si venció) y lo reescribe en las cookies.
 * Sin esto, la sesión se "cae" sola después de una hora.
 * Lo llama middleware.ts (en la raíz) antes de cada página o request a la API.
 */
export async function actualizarSesion(request: NextRequest): Promise<NextResponse> {
  const { url, key } = envSupabase();
  // NextResponse.next() = "seguí con el request normalmente". Es `let` porque se reemplaza abajo si hay cookies nuevas.
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      // Supabase lee la sesión actual desde las cookies del navegador.
      getAll() {
        return request.cookies.getAll();
      },
      // Si Supabase renovó la sesión, hay que escribir las cookies nuevas en dos lados:
      setAll(cookiesToSet, headers) {
        // 1) En el request, para que la página que se está por mostrar ya vea la sesión nueva.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        // 2) En la respuesta, para que el navegador las guarde para los próximos requests.
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Object.entries convierte un objeto en una lista de pares [clave, valor]; `([nombre, valor])` los desarma.
        Object.entries(headers).forEach(([nombre, valor]) => response.headers.set(nombre, valor));
      },
    },
  });

  // No poner código entre createServerClient y getClaims: es lo que dispara el refresco.
  // getClaims (lo que recomienda hoy la guía de Supabase para el middleware) renueva la sesión si venció y verifica
  // la firma del JWT: con claves de firma asimétricas lo hace localmente, sin ir al servidor de Auth en cada request.
  // El middleware no autoriza nada: las páginas y /api/chat siguen confirmando al usuario con getUser().
  await supabase.auth.getClaims();

  return response;
}

import { NextResponse, type NextRequest } from "next/server";
import { actualizarSesion } from "@/backend/lib/supabase/middleware";

/**
 * Next.js busca un archivo llamado middleware.ts en la raíz y ejecuta esta función
 * antes de cada request (páginas y API). Acá solo se refresca la sesión de Supabase.
 */
export async function middleware(request: NextRequest) {
  try {
    return await actualizarSesion(request);
  } catch (error) {
    // Si falta configuración o Supabase no responde, no se tumba todo el sitio con un 500 de Vercel: se deja pasar
    // el request sin refrescar la sesión, y la página que necesite Supabase muestra su propio error.
    console.error("No se pudo refrescar la sesión en el middleware:", error);
    return NextResponse.next({ request });
  }
}

/** Configuración que lee Next.js: en qué rutas corre el middleware. */
export const config = {
  // Todo menos archivos estáticos e imágenes.
  // Es una expresión regular: `(?!...)` significa "que NO empiece con..." (_next/static, imágenes, favicon).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

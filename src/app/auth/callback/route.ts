import { NextResponse, type NextRequest } from "next/server";
import { authController } from "@/backend/controllers/auth.controller";

// Google → Supabase → acá, con ?code=... (o sin code si el usuario canceló).
// Un archivo route.ts es un endpoint: exportar una función `GET` hace que responda a GET /auth/callback.
export async function GET(request: NextRequest) {
  // new URL(...) separa la dirección en partes: `searchParams` (lo que va después del ?) y `origin` (http://host:puerto).
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Si vino el code, se canjea por una sesión; si no (el usuario canceló), directamente es false.
  const ok = await authController.completarLogin(code);

  return NextResponse.redirect(ok ? `${origin}/` : `${origin}/?error=login`);
}

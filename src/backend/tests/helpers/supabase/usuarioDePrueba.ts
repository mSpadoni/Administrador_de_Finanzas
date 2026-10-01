import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { inject } from "vitest";
import type { ClienteSupabase } from "@/backend/lib/supabase/server";
import type { Database } from "@/backend/types/database";

// inject recibe los datos que dejó el setup global (setup/supabaseLocal.setup.ts): URL y claves de la base LOCAL.
const { url, publishableKey, secretKey } = inject("supabaseLocal");

/**
 * Simula las cookies del navegador de un usuario.
 * Cada llamada a `crearCliente` es como un request nuevo a la app: arma el mismo
 * tipo de cliente que `crearClienteServidor` (createServerClient de @supabase/ssr),
 * pero leyendo y escribiendo estas cookies en vez de las de Next.js.
 */
export class NavegadorDePrueba {
  private readonly cookies = new Map<string, string>();

  // Función flecha: se pasa tal cual como fábrica a los constructores de controllers y models.
  // (Una flecha guardada como atributo conserva el `this` del objeto aunque se la pase suelta a otro lado.)
  crearCliente = async (): Promise<ClienteSupabase> =>
    createServerClient<Database>(url, publishableKey, {
      cookies: {
        // `[...this.cookies]` convierte el Map en lista de pares [nombre, valor]; el map los pasa al formato de Supabase.
        getAll: () => [...this.cookies].map(([name, value]) => ({ name, value })),
        // Guarda las cookies nuevas; si vienen vacías o vencidas (maxAge 0) significa "borrala", como hace el navegador.
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (!value || options?.maxAge === 0) {
              this.cookies.delete(name);
            } else {
              this.cookies.set(name, value);
            }
          });
        },
      },
    });

  /** Los nombres de las cookies guardadas (para chequear en los tests qué dejó Supabase). */
  nombresDeCookies(): string[] {
    return [...this.cookies.keys()];
  }

  /** Las cookies como las manda el navegador en el header `Cookie` de un request. */
  headerCookie(): string {
    return [...this.cookies].map(([nombre, valor]) => `${nombre}=${valor}`).join("; ");
  }

  /**
   * Hace como si hubiera pasado más de una hora: marca la sesión guardada como vencida (el refresh token sigue
   * siendo válido). El próximo request tiene que renovarla, como pasa en el navegador de verdad.
   * @supabase/ssr guarda la sesión como "base64-<JSON en base64url>", partida en `<nombre>.0`, `.1`... si es larga.
   */
  vencerSesion(): void {
    const partes = [...this.cookies.keys()].filter((nombre) => /-auth-token(\.\d+)?$/.test(nombre)).sort();
    const valor = partes.map((nombre) => this.cookies.get(nombre)).join("");
    const sesion = JSON.parse(Buffer.from(valor.replace(/^base64-/, ""), "base64url").toString("utf8"));
    // 1970 (no 0: Supabase lo trata como "sin vencimiento"): vencida sin depender de la fecha actual.
    sesion.expires_at = 1;
    partes.forEach((nombre) => this.cookies.delete(nombre));
    const nombreBase = partes[0].replace(/\.\d+$/, "");
    this.cookies.set(nombreBase, `base64-${Buffer.from(JSON.stringify(sesion)).toString("base64url")}`);
  }
}

/** Cuándo vence la sesión que guarda una cookie de Supabase ("base64-<JSON>"), en segundos Unix. */
export function vencimientoDeSesion(valorDeCookie: string): number {
  return JSON.parse(Buffer.from(valorDeCookie.replace(/^base64-/, ""), "base64url").toString("utf8")).expires_at;
}

export type UsuarioDePrueba = {
  id: string;
  email: string;
  navegador: NavegadorDePrueba;
};

// Cliente con la secret key: solo para preparar y limpiar datos de prueba, nunca lo usa la app.
const admin = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Ids de los usuarios creados, para borrarlos al final.
const idsCreados: string[] = [];

/** Lo que Google le pasa a Supabase en user_metadata cuando el usuario se loguea. */
type DatosDeGoogle = { full_name?: string; name?: string; avatar_url?: string; picture?: string };

/**
 * Crea un usuario en la base local y lo deja logueado en su NavegadorDePrueba.
 *
 * El login con Google real no se puede automatizar (pide la pantalla de Google).
 * Lo reemplazamos por email + contraseña, que deja exactamente el mismo resultado:
 * un usuario en auth.users con los datos de Google en user_metadata, y su sesión
 * guardada en las cookies, igual que después de pasar por /auth/callback.
 */
export async function crearUsuarioLogueado(
  datosDeGoogle: DatosDeGoogle = { full_name: "Usuario de Prueba", avatar_url: "https://ejemplo.com/foto.png" }
): Promise<UsuarioDePrueba> {
  const email = `usuario-${randomUUID()}@asistente.test`;
  const password = randomUUID();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: datosDeGoogle,
  });
  if (error) throw error;
  idsCreados.push(data.user.id);

  const navegador = new NavegadorDePrueba();
  const cliente = await navegador.crearCliente();
  // `{ error: errorLogin }`: desestructura `error` pero lo guarda con otro nombre (ya había una variable `error`).
  const { error: errorLogin } = await cliente.auth.signInWithPassword({ email, password });
  if (errorLogin) throw errorLogin;

  return { id: data.user.id, email, navegador };
}

/** Borra los usuarios creados en este archivo de tests (su historial se borra en cascada). */
// splice(0) vacía la lista y devuelve lo que tenía. Promise.all lanza todos los borrados a la vez y espera que terminen.
export async function borrarUsuariosDePrueba(): Promise<void> {
  await Promise.all(idsCreados.splice(0).map((id) => admin.auth.admin.deleteUser(id)));
}

import "server-only";
import { crearClienteServidor, type ClienteSupabase } from "@/backend/lib/supabase/server";
import { Usuario } from "@/backend/models/dominio/usuario.model";
import { codigoDeLogin } from "./validaciones";

/** Todo lo relacionado con el login: iniciar sesión con Google, saber quién está logueado y cerrar sesión. */
export class AuthController {
  // La fábrica del cliente se inyecta para poder pasar un mock en los tests.
  // `private readonly crearCliente: ...` declara y asigna el atributo en un paso; `= crearClienteServidor` es el valor por defecto.
  constructor(private readonly crearCliente: () => Promise<ClienteSupabase> = crearClienteServidor) {}

  /**
   * Pide a Supabase la URL de login de Google.
   * `urlDeVuelta` es a dónde vuelve Google después (nuestro /auth/callback).
   * Devuelve null si Supabase no pudo generarla.
   * `Promise<string | null>`: como es `async`, devuelve una promesa que al resolverse da texto o null.
   */
  async urlDeLoginConGoogle(urlDeVuelta: string): Promise<string | null> {
    const supabase = await this.crearCliente();
    // signInWithOAuth no redirige solo en el servidor: devuelve la URL de Google a la que hay que mandar al usuario.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: urlDeVuelta },
    });

    if (error) {
      console.error("Error al iniciar el login con Google:", error);
      return null;
    }
    return data.url;
  }

  /**
   * Canjea el `code` que manda Google por una sesión (queda guardada en cookies).
   * Devuelve true si salió bien, false si no.
   */
  async completarLogin(code: unknown): Promise<boolean> {
    // Viene en la URL (lo manda el navegador): se valida antes de dárselo a Supabase.
    const codigo = codigoDeLogin(code);
    if (!codigo) return false;
    const supabase = await this.crearCliente();
    // Acá solo interesa `error`, por eso se desestructura solo esa propiedad.
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);

    if (error) {
      console.error("Error al completar el login:", error);
      return false;
    }
    return true;
  }

  /** Devuelve el usuario logueado (leído de las cookies de la sesión), o null si no hay nadie logueado. */
  async obtenerUsuarioActual(): Promise<Usuario | null> {
    const supabase = await this.crearCliente();
    const { data } = await supabase.auth.getUser();
    // Operador ternario: `condición ? siEsVerdadero : siEsFalso`.
    return data.user ? Usuario.desdeSupabase(data.user) : null;
  }

  /** Cierra la sesión: Supabase borra las cookies. `Promise<void>` = no devuelve nada útil, solo hay que esperarla. */
  async cerrarSesion(): Promise<void> {
    const supabase = await this.crearCliente();
    await supabase.auth.signOut();
  }
}

/** Instancia única lista para usar desde el resto de la app: `authController.obtenerUsuarioActual()`. */
export const authController = new AuthController();

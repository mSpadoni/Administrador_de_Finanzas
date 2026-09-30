import "server-only";
import { registrarError } from "@/backend/lib/registro";
import { crearClienteServidor, type ClienteSupabase } from "@/backend/lib/supabase/server";
import { Usuario } from "@/backend/models/dominio/usuario";
import { lanzarSiAuthNoRespondio } from "./erroresRepositorios";

/**
 * Acceso a Supabase Auth: el login con Google, la sesión (guardada en cookies) y el usuario logueado. Como los demás
 * repositorios, es el único que habla con Supabase: el controller solo decide qué pedirle.
 */
export class AuthModel {
  // El cliente de Supabase entra por el constructor: la app usa el del request; los tests, uno de prueba.
  // `private readonly crearCliente: ...` declara y asigna el atributo en un paso; `= crearClienteServidor` es el valor por defecto.
  constructor(private readonly crearCliente: () => Promise<ClienteSupabase> = crearClienteServidor) {}

  /**
   * Pide a Supabase la URL de login de Google. `urlDeVuelta` es a dónde vuelve Google después (nuestro /auth/callback).
   * Devuelve null si Supabase no pudo generarla.
   */
  async urlDeLoginConGoogle(urlDeVuelta: string): Promise<string | null> {
    const supabase = await this.crearCliente();
    // signInWithOAuth no redirige solo en el servidor: devuelve la URL de Google a la que hay que mandar al usuario.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: urlDeVuelta },
    });
    if (error) {
      registrarError("auth.login_con_google", error);
      return null;
    }
    return data.url;
  }

  /** Canjea el `codigo` que manda Google por una sesión (queda guardada en cookies). true si salió bien. */
  async canjearCodigo(codigo: string): Promise<boolean> {
    const supabase = await this.crearCliente();
    // Acá solo interesa `error`, por eso se desestructura solo esa propiedad.
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (error) {
      registrarError("auth.canjear_codigo", error);
      return false;
    }
    return true;
  }

  /** El usuario logueado (leído de las cookies de la sesión), o null si no hay nadie logueado. Si Auth no responde, lanza AuthNoRespondeError. */
  async usuarioActual(): Promise<Usuario | null> {
    const supabase = await this.crearCliente();
    const { data, error } = await supabase.auth.getUser();
    // Sin sesión (o vencida) es null; si Auth no respondió, corta: no es lo mismo que «tu sesión expiró».
    lanzarSiAuthNoRespondio(error);
    // Operador ternario: `condición ? siEsVerdadero : siEsFalso`.
    return data.user ? Usuario.desdeSupabase(data.user) : null;
  }

  /** Cierra la sesión: Supabase borra las cookies. */
  async cerrarSesion(): Promise<void> {
    const supabase = await this.crearCliente();
    await supabase.auth.signOut();
  }
}

/** Instancia lista para usar desde la app (con el cliente del request). */
export const authModel = new AuthModel();

import "server-only";
import { Usuario } from "@/backend/models/dominio/usuario";
import { authModel, type AuthModel } from "@/backend/models/repositorios/auth.model";
import { codigoDeLogin } from "./validacionControllers";

/**
 * Todo lo relacionado con el login: iniciar sesión con Google, saber quién está logueado y cerrar sesión.
 * Decide qué hacer (validar lo que llega del navegador y pedírselo al modelo); el que habla con Supabase Auth es el AuthModel.
 */
export class AuthController {
  // El modelo entra por el constructor (así los tests le pasan uno con su sesión); sin nada, usa el de la app.
  constructor(private readonly modeloAuth: () => AuthModel = () => authModel) {}

  /**
   * Pide la URL de login de Google. `urlDeVuelta` es a dónde vuelve Google después (nuestro /auth/callback).
   * Devuelve null si no se pudo generar.
   */
  urlDeLoginConGoogle(urlDeVuelta: string): Promise<string | null> {
    return this.modeloAuth().urlDeLoginConGoogle(urlDeVuelta);
  }

  /**
   * Canjea el `code` que manda Google por una sesión (queda guardada en cookies).
   * Devuelve true si salió bien, false si no.
   */
  async completarLogin(code: unknown): Promise<boolean> {
    // Viene en la URL (lo manda el navegador): se valida antes de dárselo a Supabase.
    const codigo = codigoDeLogin(code);
    if (!codigo) return false;
    return this.modeloAuth().canjearCodigo(codigo);
  }

  /** Devuelve el usuario logueado, o null si no hay nadie logueado. */
  obtenerUsuarioActual(): Promise<Usuario | null> {
    return this.modeloAuth().usuarioActual();
  }

  /** Cierra la sesión. `Promise<void>` = no devuelve nada útil, solo hay que esperarla. */
  cerrarSesion(): Promise<void> {
    return this.modeloAuth().cerrarSesion();
  }
}

/** Instancia única lista para usar desde el resto de la app: `authController.obtenerUsuarioActual()`. */
export const authController = new AuthController();

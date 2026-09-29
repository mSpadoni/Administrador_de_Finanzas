import type { User } from "@supabase/supabase-js";

/** Usuario logueado. Los datos vienen de Supabase Auth (auth.users), no de una tabla propia. */
export class Usuario {
  /**
   * `readonly id: string` en los parámetros del constructor declara el atributo y lo asigna en un paso.
   * `readonly`: no se puede cambiar después de crear el objeto.
   * `string | null`: puede ser texto o null (por ejemplo, si Google no mandó el nombre).
   */
  constructor(
    readonly id: string,
    readonly email: string,
    readonly nombre: string | null,
    readonly avatarUrl: string | null
  ) {}

  /**
   * Arma el Usuario a partir de lo que devuelve supabase.auth.getUser().
   * `static`: se llama sobre la clase, no sobre un objeto: `Usuario.desdeSupabase(user)`.
   */
  static desdeSupabase(user: User): Usuario {
    // Google completa estos campos en user_metadata al loguearse.
    // `a ?? b`: usa `a`, pero si es null o undefined usa `b` (acá: un objeto vacío).
    const metadata = user.user_metadata ?? {};
    return new Usuario(
      user.id,
      user.email ?? "",
      // Encadenado: prueba full_name, si no hay prueba name, y si tampoco hay queda null.
      metadata.full_name ?? metadata.name ?? null,
      metadata.avatar_url ?? metadata.picture ?? null
    );
  }

  /**
   * `get`: es un getter, se usa como si fuera un atributo, sin paréntesis: `usuario.nombreVisible`.
   * Devuelve el nombre, o el email si no hay nombre.
   */
  get nombreVisible(): string {
    return this.nombre ?? this.email;
  }

  /** Para saludar ("Hola, Mateo"). Sin nombre, usa la parte del email antes de la @. */
  get primerNombre(): string {
    // `this.nombre?.trim()`: el `?.` corta y da undefined si nombre es null, en vez de tirar error.
    // `.split(/\s+/)[0]`: separa por espacios (expresión regular) y se queda con la primera palabra.
    // `||` (a diferencia de `??`) también pasa al plan B si el resultado es texto vacío "".
    return this.nombre?.trim().split(/\s+/)[0] || this.email.split("@")[0];
  }
}

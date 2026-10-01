/** La dirección de la app cuando se desarrolla en la máquina (`npm run dev`). */
const ORIGEN_LOCAL = "http://localhost:3000";

/** Solo para los hosts que no traen protocolo (no hay `Origin` ni `x-forwarded-proto`): local es http, el resto https. */
const HOSTS_LOCALES = ["localhost", "127.0.0.1", "[::1]"];

type Cabeceras = Pick<Headers, "get">;

/**
 * La dirección de la app (ej. https://mi-app.vercel.app) para armar la URL a la que Google vuelve después del login
 * (`<origen>/auth/callback`). Se busca en este orden:
 * 1. `Origin`: la manda el navegador en los pedidos POST (un Server Action lo es).
 * 2. El host con el que llegó el pedido: `x-forwarded-host` (lo pone Vercel) o `host`, con su protocolo.
 * 3. localhost:3000, solo si no hay ninguna pista (desarrollo).
 *
 * Que el navegador pueda mandar un `Origin` inventado no es un riesgo: Supabase solo redirige a las direcciones
 * cargadas en Authentication → URL Configuration → Redirect URLs, y a cualquier otra rechaza el login.
 */
export function origenDeLaPeticion(cabeceras: Cabeceras): string {
  const origin = cabeceras.get("origin");
  if (origin) return origin;

  const host = cabeceras.get("x-forwarded-host") ?? cabeceras.get("host");
  if (!host) return ORIGEN_LOCAL;

  const esLocal = HOSTS_LOCALES.some((local) => host === local || host.startsWith(`${local}:`));
  const protocolo = cabeceras.get("x-forwarded-proto") ?? (esLocal ? "http" : "https");
  return `${protocolo}://${host}`;
}

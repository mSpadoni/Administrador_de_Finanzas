// Todas las URLs de la app en un solo lugar. En Next.js cada ruta la define una carpeta de src/app/ (por ejemplo,
// src/app/conversacion/[id]/page.tsx atiende /conversacion/<id>); este archivo es la única fuente de los textos de esas
// URLs, para que ningún componente, acción ni test las escriba a mano. Lógica pura: la usan el servidor y el navegador.
//
// | URL                    | Archivo que la atiende                    | Qué hace                                             |
// | ---------------------- | ----------------------------------------- | ---------------------------------------------------- |
// | /                      | src/app/page.tsx                          | Sin sesión: bienvenida con Google. Con sesión: chat. |
// | /?error=login          | src/app/page.tsx                          | La bienvenida con el aviso de que falló el login.    |
// | /conversacion/<id>     | src/app/conversacion/[id]/page.tsx        | Una conversación (nueva o guardada).                 |
// | /api/chat (POST)       | src/app/api/chat/route.ts                 | Un mensaje al asistente; responde en streaming.      |
// | /auth/callback (GET)   | src/app/auth/callback/route.ts            | La vuelta del login de Google: crea la sesión.       |

/** Las URLs fijas de la app. */
export const RUTAS = {
  /** La pantalla de inicio. */
  inicio: "/",
  /** El endpoint del chat (lo llama useChat con cada mensaje). */
  apiDelChat: "/api/chat",
  /** A dónde vuelve Google (vía Supabase) después del login. */
  vueltaDelLogin: "/auth/callback",
} as const;

/** El valor de `?error=` con el que se vuelve al inicio cuando falló el login. */
export const ERROR_DE_LOGIN = "login";

/** El inicio con el aviso de que falló el login: `/?error=login`. */
export const RUTA_DE_LOGIN_FALLIDO = `${RUTAS.inicio}?error=${ERROR_DE_LOGIN}`;

const PREFIJO_DE_CONVERSACION = "/conversacion/";

/** La URL de una conversación: `/conversacion/<id>`. */
export function rutaDeConversacion(id: string): string {
  return `${PREFIJO_DE_CONVERSACION}${id}`;
}

/** El id de conversación que hay en una URL (`/conversacion/<uuid>`), o null si no es la de una conversación. */
export function idDeConversacionEnLaRuta(ruta: string): string | null {
  const coincidencia = new RegExp(`^${PREFIJO_DE_CONVERSACION}([0-9a-f-]{36})/?$`, "i").exec(ruta);
  return coincidencia?.[1] ?? null;
}

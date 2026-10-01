import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";

export type SupabaseLocal = {
  url: string;
  publishableKey: string;
  secretKey: string;
};

// Le avisa a TypeScript que `inject("supabaseLocal")` existe y devuelve un SupabaseLocal
// (amplía la definición de tipos de vitest, no genera código).
declare module "vitest" {
  export interface ProvidedContext {
    supabaseLocal: SupabaseLocal;
  }
}

/**
 * Corre una vez antes de todos los tests: busca la copia local de Supabase
 * (la que levanta `npm run db:start` en Docker) y les pasa su URL y claves.
 * Nunca usa las variables de .env.local, así los tests no pueden tocar la base real.
 */
export default function setup(project: TestProject) {
  let salida: string;
  try {
    // execSync ejecuta un comando de consola y devuelve lo que imprimió (acá, el estado de Supabase en JSON).
    salida = execSync("npx supabase status -o json --workdir src/backend", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(
      "La base local de Supabase no está corriendo. Abrí Docker Desktop y corré `npm run db:start` antes de `npm test`."
    );
  }

  // Se corta desde la primera "{" por si el comando imprime algún aviso antes del JSON.
  const estado = JSON.parse(salida.slice(salida.indexOf("{")));
  const url: string = estado.API_URL;

  // Seguridad: la URL tiene que ser localhost o 127.0.0.1 (con puerto opcional). Si no, se frena todo.
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(`Los tests solo corren contra la base local, no contra ${url}`);
  }

  // provide deja estos datos disponibles para los tests (los leen con inject("supabaseLocal")).
  // Según la versión del CLI las claves se llaman distinto: por eso el `??` entre nombre nuevo y viejo.
  project.provide("supabaseLocal", {
    url,
    publishableKey: estado.PUBLISHABLE_KEY ?? estado.ANON_KEY,
    secretKey: estado.SECRET_KEY ?? estado.SERVICE_ROLE_KEY,
  });
}

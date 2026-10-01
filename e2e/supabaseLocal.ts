import { execSync } from "node:child_process";

/** La base local de Supabase (Docker) contra la que corren los E2E: nunca la de producción ni una compartida. */
export type SupabaseLocal = { url: string; publishableKey: string; secretKey: string };

/** Lee la URL y las claves de la Supabase local (la que levanta `npm run db:start`). */
export function supabaseLocal(): SupabaseLocal {
  let salida: string;
  try {
    salida = execSync("npx supabase status -o json --workdir src/backend", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error("La base local de Supabase no está corriendo: abrí Docker Desktop y corré `npm run db:start`.");
  }
  // Se corta desde la primera "{" por si el comando imprime algún aviso antes del JSON.
  const estado = JSON.parse(salida.slice(salida.indexOf("{")));
  const url: string = estado.API_URL;
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(`Los E2E solo corren contra una Supabase local, no contra ${url}.`);
  }
  return { url, publishableKey: estado.PUBLISHABLE_KEY, secretKey: estado.SECRET_KEY };
}

import { randomUUID } from "node:crypto";
import { test as base, expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { supabaseLocal } from "./supabaseLocal";

// Cada test arranca con una persona nueva, ya logueada: su base de datos empieza vacía (sin conversaciones ni
// movimientos) y al terminar se borra (todo lo suyo se borra en cascada). El login con Google no se puede automatizar:
// se reemplaza por email y contraseña, que deja la misma sesión en las mismas cookies que después de /auth/callback.

const local = supabaseLocal();

// Cliente con la secret key: solo para crear y borrar personas de prueba; la app nunca la usa.
const admin = createClient(local.url, local.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

/** Las cookies de sesión que deja Supabase al iniciar sesión, como las guarda el navegador. */
async function cookiesDeSesion(email: string, password: string) {
  const cookies = new Map<string, string>();
  const cliente = createServerClient(local.url, local.publishableKey, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (nuevas) => nuevas.forEach(({ name, value }) => cookies.set(name, value)),
    },
  });
  const { error } = await cliente.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return [...cookies].map(([name, value]) => ({
    name,
    value,
    domain: "127.0.0.1",
    path: "/",
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));
}

type Persona = { id: string; email: string; password: string; nombre: string };
type Fixtures = { persona: Persona };

export const test = base.extend<Fixtures>({
  persona: async ({}, usar) => {
    const email = `e2e-${randomUUID()}@asistente.test`;
    const password = randomUUID();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Mateo Prueba" },
    });
    if (error) throw error;
    await usar({ id: data.user.id, email, password, nombre: "Mateo Prueba" });
    await admin.auth.admin.deleteUser(data.user.id);
  },
  // La sesión de esa persona, en las cookies del navegador del test. (`usar` es el `use` de los fixtures de Playwright.)
  storageState: async ({ persona }, usar) => {
    await usar({ cookies: await cookiesDeSesion(persona.email, persona.password), origins: [] });
  },
});

export { expect };

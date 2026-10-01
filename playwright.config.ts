import { defineConfig, devices } from "@playwright/test";
import { supabaseLocal } from "./e2e/supabaseLocal";

// Tests de punta a punta (REGLAS-SKILLS 3.1 y 3.3): pocos, solo los flujos críticos, en e2e/*.spec.ts.
// Levantan su propio servidor de Next en el puerto 3100 (con su propia carpeta de build, .next-e2e) apuntado a:
// - la Supabase LOCAL de Docker (nunca la de producción),
// - un OpenAI y un dolarapi.com falsos que corren en esta máquina (e2e/servidores/falsos.mjs).
// Correr con `npm run test:e2e` (hace falta Docker con `npm run db:start`).

const PUERTO = 3100;
const local = supabaseLocal();

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  // Un solo navegador a la vez: el OpenAI falso cuenta los pedidos (para simular «saturado») y es compartido.
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "compu",
      testIgnore: "**/celular.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    { name: "celular", testMatch: "**/celular.spec.ts", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "node e2e/servidores/falsos.mjs",
      port: 3101,
      reuseExistingServer: false,
    },
    {
      command: `npx next dev --hostname 127.0.0.1 --port ${PUERTO}`,
      url: `http://127.0.0.1:${PUERTO}`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        SUPABASE_URL: local.url,
        SUPABASE_PUBLISHABLE_KEY: local.publishableKey,
        OPENAI_API_KEY: "sk-e2e-de-mentira",
        OPENAI_BASE_URL: "http://127.0.0.1:3101/v1",
        OPENAI_MODEL: "modelo-falso",
        DOLARAPI_URL: "http://127.0.0.1:3102/v1/dolares",
        FIRMA_DE_MENSAJES: "clave-de-firma-solo-para-los-e2e-0123456789",
      },
    },
  ],
});

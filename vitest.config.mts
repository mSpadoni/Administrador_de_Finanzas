import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Configuración de Vitest. Los tests viven en src/backend/tests/ y src/frontend/tests/:
// - unitarios: lógica pura y componentes. Sin Docker ni internet.
// - integracion-supabase: copia local de Supabase (Docker), RLS, auth y middleware.
// - integracion-http-local: adaptadores contra servidores HTTP locales, sin Docker ni internet.
// Ningún test depende de internet ni de un LLM real: `npm test` corre los dos grupos.

/** Lo que comparten los grupos que usan la base local. */
const conSupabaseLocal = {
  // Busca la Supabase local antes de empezar (y avisa si Docker no está corriendo).
  globalSetup: ["src/backend/tests/setup/supabaseLocal.setup.ts"],
  // Cada test habla por HTTP con la base local: más margen que los 5 s por defecto.
  testTimeout: 30_000,
  hookTimeout: 30_000,
};

export default defineConfig({
  // tsconfig tiene "jsx": "preserve" (lo transforma Next); en los tests de componentes lo transforma Vite.
  oxc: { jsx: { runtime: "automatic" } },
  // Hace que el atajo `@/` en los imports apunte a la raíz del proyecto, igual que en tsconfig.json.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src/", import.meta.url)),
      // `server-only` tira un error si se importa fuera del servidor de Next (condición "react-server").
      // Los tests corren en Node, que es servidor: se usa el mismo archivo vacío que usa Next en el servidor.
      "server-only": fileURLToPath(new URL("node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    // Ninguna variable de .env.local llega a los tests: ni las de Supabase real ni la clave de OpenAI. Estas son de mentira
    // y apuntan a un puerto cerrado, así un test que se olvide de pasar un modelo de prueba falla enseguida y sin costo.
    env: {
      OPENAI_API_KEY: "sk-test-invalida",
      OPENAI_BASE_URL: "http://127.0.0.1:9/v1",
      OPENAI_MODEL: "modelo-de-prueba",
      FIRMA_DE_MENSAJES: "clave-de-firma-solo-para-los-tests-0123456789",
    },
    projects: [
      {
        extends: true, // usa el alias y las variables de arriba (de mentira)
        test: {
          name: "unitarios",
          include: ["src/backend/tests/unitarios/**/*.test.{ts,tsx}", "src/frontend/tests/**/*.test.{ts,tsx}"],
          // Los tests de componentes con jsdom tardan en importar: más margen que los 5 s por defecto.
          testTimeout: 20_000,
        },
      },
      {
        extends: true,
        test: {
          name: "integracion-supabase",
          include: ["src/backend/tests/integracion/supabase/**/*.test.ts"],
          ...conSupabaseLocal,
        },
      },
      {
        extends: true,
        test: {
          name: "integracion-http-local",
          include: ["src/backend/tests/integracion/http-local/**/*.test.ts"],
          testTimeout: 30_000,
        },
      },
    ],
  },
});

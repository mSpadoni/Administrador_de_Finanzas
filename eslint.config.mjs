import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// ESLint revisa el código buscando errores comunes y malas prácticas (`npm run lint`).
// En módulos .mjs no existen __filename/__dirname: se reconstruyen a partir de import.meta.url.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// ---------------------------------------------------------------------------------------------------------------
// Reglas de dependencia de la arquitectura (ver docs/ARQUITECTURA.md). Si alguien importa algo que no corresponde,
// `npm run lint` (y el build de Vercel) fallan con el motivo.

/** El backend no depende de las rutas ni del frontend. */
const backendNoDependeDeAppNiFrontend = {
  group: ["@/app/*", "@/app/**", "@/frontend/*", "@/frontend/**"],
  message: "El backend no depende de las rutas (app/) ni del frontend: ellas dependen de él, no al revés.",
};

/**
 * `@typescript-eslint/no-restricted-imports` con `patterns`. Si varias configuraciones tocan el mismo archivo, gana la
 * última: por eso el dominio repite la regla del backend.
 */
const prohibir = (...patterns) => ({ "@typescript-eslint/no-restricted-imports": ["error", { patterns }] });

const reglasDeDependencia = [
  {
    // Frontend (componentes, hooks, lógica de UI y sus tests). Los datos llegan por props y las acciones como Server Actions que conecta la página.
    files: ["src/frontend/**/*.{ts,tsx}"],
    rules: prohibir({
      group: ["@/backend/*", "@/backend/**", "@supabase/*"],
      message:
        "El frontend no importa el backend ni Supabase: reciben los datos por props y las acciones por Server Actions.",
    }),
  },
  {
    // Backend (menos los tests, que prueban también funciones del frontend).
    files: ["src/backend/**/*.ts"],
    ignores: ["src/backend/tests/**"],
    rules: prohibir(backendNoDependeDeAppNiFrontend),
  },
  {
    // Controllers, servicios, datos, asistente y errores: no saben de HTTP ni de Next. La respuesta HTTP la arman las rutas.
    files: [
      "src/backend/controllers/**/*.ts",
      "src/backend/servicios/**/*.ts",
      "src/backend/models/**/*.ts",
      "src/backend/asistente/**/*.ts",
      "src/backend/tools/**/*.ts",
      "src/backend/erroresBackend.ts",
    ],
    rules: prohibir(backendNoDependeDeAppNiFrontend, {
      group: ["next/server", "next/headers", "next/navigation"],
      message: "Los casos de uso no manejan HTTP: devuelven datos o tiran un ErrorDeAplicacion y la ruta responde.",
    }),
  },
  {
    // Rutas: delegan en controllers; no tocan Supabase ni los repositorios directamente.
    files: ["src/app/**/*.{ts,tsx}"],
    rules: prohibir({
      group: [
        "@supabase/*",
        "@/backend/lib/supabase/*",
        "@/backend/models/repositorios/*",
        "@/backend/asistente/agente",
      ],
      message: "Las rutas no usan Supabase, los repositorios ni el agente directamente: pasan por un controller.",
    }),
  },
  {
    // src/shared/: código que usan tanto el servidor como el navegador. Lógica pura: no puede importar nada del servidor
    // (si no, lo arrastraría al navegador) ni del frontend o rutas.
    files: ["src/shared/**/*.ts"],
    rules: prohibir({
      group: [
        "@/backend/*",
        "@/backend/**",
        "@/frontend/*",
        "@/frontend/**",
        "@/app/*",
        "@/app/**",
        "next",
        "next/*",
        "@supabase/*",
        "ai",
        "@ai-sdk/*",
        "server-only",
      ],
      message:
        "src/shared/ es lógica pura compartida por servidor y navegador: no importa backend, frontend, rutas ni SDKs (solo `import type`).",
      allowTypeImports: true,
    }),
  },
  {
    // Dominio: lógica pura, sin Next, Supabase, AI SDK ni infraestructura. Se permiten imports de solo tipos
    // (`import type`), que desaparecen al compilar.
    files: ["src/backend/models/dominio/**/*.ts"],
    rules: prohibir(backendNoDependeDeAppNiFrontend, {
      group: [
        "next",
        "next/*",
        "@supabase/*",
        "ai",
        "@ai-sdk/*",
        "@/backend/lib/*",
        "@/backend/lib/**",
        "@/backend/models/repositorios/*",
        "server-only",
      ],
      message:
        "El dominio es lógica pura: sin Next, Supabase, AI SDK, repositorios ni infraestructura (solo `import type`).",
      allowTypeImports: true,
    }),
  },
  {
    // Tests rápidos: corren sin Docker ni internet. Lo que usa Supabase, dolarapi u OpenAI va en tests/integracion/.
    files: ["src/backend/tests/rapidos/**/*.{ts,tsx}"],
    rules: prohibir({
      group: [
        "../helpers/usuarioDePrueba",
        "@supabase/*",
        "@ai-sdk/*",
        "@/backend/lib/dolar",
        "@/backend/lib/supabase/*",
      ],
      message:
        "Los tests rápidos no usan Supabase, dolarapi ni OpenAI (solo `import type`): este test va en src/backend/tests/integracion/.",
      allowTypeImports: true,
    }),
  },
];

// Usa las reglas recomendadas por Next.js (rendimiento web + TypeScript). FlatCompat adapta ese formato viejo al nuevo.
// No se revisa lo generado (igual que en .gitignore): builds de Next, next-env.d.ts (que Next pide no tocar),
// cobertura y reportes de Playwright.
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-e2e/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...reglasDeDependencia,
];

export default eslintConfig;

import type { NextConfig } from "next";

// Configuración de Next.js. `: NextConfig` hace que el editor autocomplete y valide las opciones.
const nextConfig: NextConfig = {
  // Los tests de punta a punta (Playwright) levantan su propio servidor en otra carpeta, así no pisan el build ni el
  // servidor de desarrollo que pueda estar corriendo (ver playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Carpetas que revisa ESLint en `npm run lint` y en el build (por defecto Next solo mira app/, pages/, lib/...):
  // así las reglas de arquitectura de eslint.config.mjs se aplican a todo el código.
  eslint: {
    dirs: ["src/app", "src/backend", "src/frontend", "src/shared"],
  },
};

export default nextConfig;

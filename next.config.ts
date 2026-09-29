import type { NextConfig } from "next";

// Configuración de Next.js. `: NextConfig` hace que el editor autocomplete y valide las opciones.
const nextConfig: NextConfig = {
  // /api/chat lee la base de conocimiento con fs en tiempo de ejecución: hay que incluirla en el deploy.
  outputFileTracingIncludes: {
    "/api/chat": ["./backend/knowledge/**/*"],
  },
  // Carpetas que revisa ESLint en `npm run lint` y en el build (por defecto Next solo mira app/, pages/, lib/...):
  // así las reglas de arquitectura de eslint.config.mjs se aplican a todo el código.
  eslint: {
    dirs: ["app", "backend", "views", "shared"],
  },
};

export default nextConfig;

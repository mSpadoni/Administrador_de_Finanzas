import type { NextConfig } from "next";

// Configuración de Next.js. `: NextConfig` hace que el editor autocomplete y valide las opciones.
const nextConfig: NextConfig = {
  // Carpetas que revisa ESLint en `npm run lint` y en el build (por defecto Next solo mira app/, pages/, lib/...):
  // así las reglas de arquitectura de eslint.config.mjs se aplican a todo el código.
  eslint: {
    dirs: ["app", "backend", "frontend", "shared"],
  },
};

export default nextConfig;

import type { Metadata, Viewport } from "next";
import "./globals.css"; // Importar el CSS acá lo aplica a todas las páginas.

// Next.js lee esta constante y la usa para el <title> y la descripción de la pestaña del navegador.
export const metadata: Metadata = {
  title: "Administrador de Finanzas",
  description:
    "Asistente de finanzas personales: registrá gastos e ingresos, mirá tus estadísticas y el dólar del día.",
};

/** El color de la barra del navegador en el celular, según el tema (los mismos que el fondo de la app). */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

/**
 * Layout raíz: el "marco" HTML que envuelve a todas las páginas de la app.
 * `children` es la página que toca mostrar (ej. app/page.tsx); Next.js la pasa sola.
 * `({ children }: Readonly<{ children: React.ReactNode }>)`: recibe un objeto de props, lo desestructura,
 * y declara su tipo: `children` es cualquier cosa que React sabe dibujar. `Readonly` = no se modifica.
 * `export default`: es lo principal que exporta el archivo (se importa sin llaves).
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Esto es JSX: HTML dentro de JavaScript. `className` es el `class` de HTML (clases de Tailwind).
  // Las llaves `{...}` meten un valor de JavaScript dentro del HTML.
  return (
    <html lang="es-AR">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}

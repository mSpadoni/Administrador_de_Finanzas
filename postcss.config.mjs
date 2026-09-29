// PostCSS procesa el CSS al compilar. El único plugin es Tailwind: convierte las clases (bg-blue-700, px-4...) en CSS real.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;

# Administrador de Finanzas

Asistente de finanzas personales para Argentina: contale tus gastos e ingresos como se los contarías a alguien y los
registra, te dice en qué se va la plata y a cuánto está el dólar. Chat con un LLM que usa herramientas (tool calling)
sobre tus datos en Supabase y las cotizaciones de [dolarapi.com](https://dolarapi.com).

Stack: Next.js 15 (App Router), TypeScript, Vercel AI SDK, OpenAI, Supabase (Postgres + Auth con Google + RLS), Vercel.

- Vocabulario del dominio: [CONTEXT.md](CONTEXT.md)
- Arquitectura: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)
- Decisiones: [docs/adr/](docs/adr/)

## Instalación

```bash
npm install
copy .env.example .env.local
npm run dev
```

Ver `.env.example` para las variables requeridas.

## Configuración

1. **Supabase:** crear el proyecto y aplicar el esquema (una sola migración):

   ```bash
  npx supabase link --project-ref <id-del-proyecto> --workdir src/backend
  npx supabase db push --workdir src/backend
   ```

  (o pegar `src/backend/supabase/migrations/20260929000000_esquema_inicial.sql` en el SQL Editor).
   Copiar Project URL y publishable key a `.env.local`. En Authentication → URL Configuration: Site URL
   `http://localhost:3000` y Redirect URL `http://localhost:3000/auth/callback` (y las de Vercel).

2. **Google OAuth:** crear un OAuth client (Web application) con redirect URI
   `https://<id-del-proyecto>.supabase.co/auth/v1/callback`, y cargar Client ID y Client secret en Supabase →
   Authentication → Sign In / Providers → Google.
3. **OpenAI:** crear una API key en platform.openai.com → `OPENAI_API_KEY` en `.env.local`.

## Tests

Los tests son deterministas: ninguno depende de internet, de un LLM real, del reloj ni del orden en que se ejecutan.

- **Rápidos** (`src/backend/tests/rapidos/` y `src/frontend/tests/`): dominio, controllers con dobles, funciones y
  componentes. Sin Docker ni internet.
- **Integración Supabase** (`src/backend/tests/integracion/supabase/`): repositorios, RLS, auth, middleware y tools contra
  una **copia local de Supabase** en Docker (misma migración, mismas políticas).
- **Integración HTTP local** (`src/backend/tests/integracion/http-local/`): cliente del dólar y su tool contra un servidor
  HTTP local, sin internet ni Docker.

```bash
# Una vez por sesión (Docker Desktop abierto).
npm run db:start
npm test                           # rápidos + ambas integraciones
npm run test:rapidos               # rápidos, sin Docker
npm run test:integracion:http-local # integración HTTP local, sin Docker
npm run test:integracion:supabase   # integración con Supabase local
npm run db:stop
```

## Deploy

Vercel despliega cada push a `main`. Variables de entorno en Vercel: las mismas de `.env.example`.

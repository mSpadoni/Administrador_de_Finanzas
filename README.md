# Administrador de Finanzas

Asistente de finanzas personales para Argentina. Le contás tus gastos e ingresos como se los contarías a alguien
(«gasté 5.000 en el súper con débito», «me pagaron el sueldo, 900 lucas») y los registra, te dice en qué se te va la
plata y a cuánto está el dólar. Es un chat con un LLM que usa herramientas (tool calling) sobre tus datos en Supabase y
las cotizaciones de [dolarapi.com](https://dolarapi.com).

**En producción:** https://administrador-de-finanzas-mspadoni.vercel.app (se entra con Google).

## Qué hace

- **Registra movimientos** (gastos e ingresos, en pesos o dólares) a partir de lo que escribís. Si falta un dato, lo
  pregunta en vez de inventarlo. Los dólares se guardan con su monto original y en pesos con la cotización del día.
- **Consulta y resume:** los movimientos de un período, el balance, los gastos por categoría, el promedio diario y la
  comparación con el período anterior.
  El panel «Este mes» se actualiza solo cada vez que el asistente registra o borra algo.
- **Dólar:** cotizaciones del día (oficial, blue, MEP y tarjeta) y conversiones entre pesos y dólares.
- **Borra movimientos** con confirmación.
- **Conversaciones guardadas:** cada charla tiene su título, se puede volver a abrir y borrar.
- **Panel de debug:** para cada respuesta muestra el modelo, las tools que usó (con sus datos y resultados), los tokens
  y la demora.
- **Celular, tablet y compu:** en pantallas chicas los paneles se abren como cajones (con el resto de la página
  bloqueado mientras están abiertos). Tema claro y oscuro según el sistema, con contraste WCAG AA en los dos.

### Las tools del asistente

| Tool                    | Qué hace                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `registrar_movimiento`  | Guarda un gasto o ingreso (monto, moneda, categoría, medio de pago, fecha).               |
| `consultar_movimientos` | Lista los movimientos de un período con sus totales (y da el id para borrar).             |
| `estadisticas`          | Balance, gastos por categoría, promedio diario y variación contra el período anterior.    |
| `borrar_movimiento`     | Borra un movimiento (después de que la persona lo confirma).                              |
| `cotizacion_dolar`      | Cotización del dólar oficial, blue, MEP y tarjeta (dolarapi.com, con caché y reintentos). |
| `convertir`             | Pasa un monto de pesos a dólares o al revés con la cotización actual.                     |

## Stack

Next.js 15 (App Router) · TypeScript · React 19 · Tailwind CSS 4 · Vercel AI SDK + OpenAI · Supabase (Postgres, Auth
con Google y RLS) · Zod · Vitest + Testing Library · Playwright · Vercel.

## Decisiones de diseño

- **Arquitectura MVC por capas** (rutas → controllers → dominio / repositorios / asistente), con reglas de dependencia
  que hace cumplir ESLint: el frontend no importa el backend, el dominio es lógica pura, las rutas no tocan Supabase.
  Detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
- **Seguridad de los datos:** RLS en todas las tablas (cada persona ve solo lo suyo), la app nunca usa la `service_role`
  key y la API del chat exige sesión.
- **El modelo no puede ser engañado con historial falso:** el servidor firma (HMAC) cada respuesta del asistente y, al
  armar el contexto, descarta las que no tienen firma válida.
- **Cuota de uso** (10 mensajes por minuto y 150 por día): la cuenta una función de Postgres en un solo paso y con
  candado, así no se puede esquivar borrando conversaciones ni mandando pedidos en paralelo.
- **Plata en centavos enteros** en el dominio (nunca floats sueltos) y `numeric` en la base.
- **Fechas en hora de Argentina**, con el «hoy» por parámetro para que los tests sean deterministas. Una fecha futura
  solo se acepta si tiene sentido (un cheque diferido, un débito programado).
- **Las tools no lanzan:** si algo falla devuelven `{ ok: false, motivo }` y el modelo se lo explica a la persona.
- **Validaciones y errores ordenados:** cada carpeta tiene un `validacion<Carpeta>.ts` (todo el Zod) y un
  `errores<Carpeta>.ts` (todos los errores); un único lugar traduce errores a HTTP.

Vocabulario del dominio: [CONTEXT.md](CONTEXT.md). Decisiones registradas: [docs/adr/](docs/adr/).

## Correrlo en tu máquina

Requisitos: Node 20+, una cuenta de Supabase, una API key de OpenAI y, para los tests de integración y E2E, Docker
Desktop.

```bash
npm install
cp .env.example .env.local   # en Windows (cmd): copy .env.example .env.local
npm run dev
```

`.env.example` explica cada variable. Las obligatorias son `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
y `FIRMA_DE_MENSAJES` (un texto aleatorio de 32 caracteres o más).

### Configuración de Supabase

1. Crear el proyecto y aplicar las migraciones de `src/backend/supabase/migrations/` (esquema inicial, cuota de uso y
   firma de mensajes):

   ```bash
   npx supabase link --project-ref <id-del-proyecto> --workdir src/backend
   npx supabase db push --workdir src/backend
   ```

   (o pegarlas en orden en el SQL Editor).

2. Copiar la Project URL y la publishable key a `.env.local`.
3. En Authentication → URL Configuration: Site URL `http://localhost:3000` y Redirect URL
   `http://localhost:3000/auth/callback` (más las de Vercel, para producción).
4. **Google OAuth:** crear un OAuth client (Web application) con redirect URI
   `https://<id-del-proyecto>.supabase.co/auth/v1/callback` y cargar el Client ID y el Client secret en Supabase →
   Authentication → Sign In / Providers → Google.

## Tests

Ningún test llama a OpenAI ni a dolarapi.com de verdad (se usan un modelo falso del AI SDK y servidores falsos), ni usa
una base remota: la persistencia se prueba contra una copia local de Supabase en Docker, con las mismas migraciones y
políticas RLS. Son deterministas: no dependen de internet, del reloj ni del orden.

| Suite                  | Dónde                                               | Qué prueba                                                                               |
| ---------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Rápidos                | `src/backend/tests/rapidos/`, `src/frontend/tests/` | Dominio, controllers, tools, asistente y componentes. Sin Docker ni internet.            |
| Integración Supabase   | `src/backend/tests/integracion/supabase/`           | Repositorios, RLS, auth, cuota, firma y tools contra la base local.                      |
| Integración HTTP local | `src/backend/tests/integracion/http-local/`         | El cliente del dólar contra un servidor HTTP local (errores, timeouts, 429).             |
| De punta a punta (E2E) | `e2e/`                                              | Flujos críticos en el navegador, en compu y celular, con chequeo de accesibilidad (axe). |

```bash
npm run db:start               # una vez por sesión (Docker Desktop abierto)
npm test                       # rápidos + las dos integraciones
npm run test:rapidos           # solo los rápidos, sin Docker
npm run test:e2e               # Playwright (levanta su propio Next y los servidores falsos)
npm run db:stop
```

Otros scripts: `npm run lint`, `npm run build`, `npm run db:reset` (base local limpia), `npm run db:types` (regenera los
tipos de la base).

## Deploy

Vercel despliega cada push a `main`. En Vercel van las mismas variables de `.env.example` (`OPENAI_API_KEY` y
`FIRMA_DE_MENSAJES` como secretas). Las migraciones nuevas se aplican en la Supabase de producción antes de desplegar
el código que las usa.

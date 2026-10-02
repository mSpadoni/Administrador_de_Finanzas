# Arquitectura

Arquitectura **en capas** sobre Next.js (App Router) + Supabase. Cada capa tiene una sola responsabilidad y solo depende de
las de abajo; las reglas de dependencia se hacen cumplir solas (`npm run lint` y el build fallan si alguien las rompe).

```text
Frontend (src/frontend)        lo que se ve: recibe datos por props y las acciones como Server Actions
   │
   ▼
Rutas (src/app)                entrada al servidor: sesión, delegar, traducir errores a HTTP
   │
   ▼
Controllers ──► Asistente ──► Tools          el modelo de lenguaje y sus herramientas
   │                            │
   ▼                            ▼
Servicios                      lógica que comparten varios puntos de entrada (tools y pantalla)
   │
   ▼
Dominio · Repositorios · Infraestructura     reglas puras · Supabase · OpenAI, dolarapi, firma, log
```

Ver también el diagrama en [`diagramas/capas.svg`](diagramas/capas.svg).

## Estructura de código

El código de la aplicación vive bajo `src/`; las configuraciones de Next.js, TypeScript, Vitest, Playwright, ESLint y npm
permanecen en la raíz del repositorio.

```text
src/
├── app/       # Rutas, Route Handlers y Server Actions de Next.js
├── backend/   # Controllers, servicios, dominio, repositorios, asistente, tools e infraestructura (+ sus tests en backend/tests/)
├── frontend/  # Componentes React y lógica de presentación (+ sus tests en frontend/tests/)
├── shared/    # Contratos y lógica pura compartida
└── middleware.ts
e2e/           # Tests de punta a punta (Playwright) y los servidores falsos que usan
```

La raíz conserva los archivos que Next.js, npm, TypeScript y las herramientas del repositorio esperan allí: `package.json`,
`package-lock.json`, configuraciones (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.mts`,
`playwright.config.ts`), `next-env.d.ts`, `.env.example`, `README.md` y las reglas para los agentes de IA (`CLAUDE.md`,
`REGLAS-SKILLS.md`). Las skills de los agentes se instalan en cada máquina y git las ignora (`.claude/skills/`, `.agents/`,
`skills-lock.json`). `CONTEXT.md` (el glosario del dominio) permanece en la raíz para que las skills de dominio lo
encuentren con la convención actual.

`docs/` agrupa arquitectura y ADRs. Los archivos de configuración y entorno no se mueven a `docs/` ni a `src/`.

## Capas

| Capa            | Carpeta                                                                     | Qué hace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Puede usar                                     |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Rutas           | `src/app/`                                                                  | Páginas, Route Handlers y Server Actions. Finas: sesión, validación de entrada, delegar. `api/respuestaDeError.ts` es el único lugar que traduce un error a HTTP.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | controllers, dominio, frontend, `lib/registro` |
| Controllers     | `src/backend/controllers/`                                                  | Atienden un pedido que llega por una ruta. `ChatController` (un mensaje del chat), `ConversacionesController` (lo que piden las Server Actions: abrir, borrar y titular una conversación; valida el id y delega en el servicio), `PantallaController` (lo que lee la página de una conversación) y `AuthController`. Un controller no llama a otro controller: lo que comparten va a un servicio. No saben de HTTP (salvo el stream del chat, que es el contrato del AI SDK) ni de Postgres.                                                                                                                                                      | servicios, repositorios, dominio, tools, lib   |
| Servicios       | `src/backend/servicios/`                                                    | Las reglas que comparten el chat y la pantalla. `MovimientosServicio` (registrar, consultar, estadísticas, borrar, convertir), `CotizacionesServicio` (el dólar) y `ConversacionesServicio` (listar, abrir, borrar y titular conversaciones). Los de movimientos y cotizaciones los usan las tools del asistente y el panel «Este mes» (vía `PantallaController`): así los dos dan siempre los mismos números. El de conversaciones lo usan la página (vía `PantallaController`) y las Server Actions (vía `ConversacionesController`). Reciben datos ya validados. No lanzan por un dato mal pedido: devuelven `{ ok: false, motivo, detalle }`. | repositorios, dominio, lib                     |
| Repositorios    | `src/backend/models/repositorios/` (conversaciones, movimientos, uso, auth) | Únicos que hablan con Supabase (con `datosOError` de `lib/supabase/consultas.ts`; `AuthModel` con Supabase Auth). Traducen lo de la base a errores propios (`erroresRepositorios.ts`: `ConversacionYaExisteError`, `AuthNoRespondeError`) para que controllers y servicios no conozcan códigos de Postgres. Sin interfaces: una sola implementación.                                                                                                                                                                                                                                                                                              | lib/supabase, lib/firma                        |
| Dominio         | `src/backend/models/dominio/`                                               | Lógica pura: qué es un movimiento (`movimiento`, `validacionDominio`), la plata (`dinero`, `moneda` con una estrategia por moneda, `conversion`), los períodos (`periodo`, con una estrategia por unidad), el balance y las estadísticas, el usuario y los límites de uso.                                                                                                                                                                                                                                                                                                                                                                        | Zod, **solo tipos** de otras librerías         |
| Asistente (LLM) | `src/backend/asistente/`, `src/backend/tools/`, `src/backend/lib/openai.ts` | `agente.ts`: la llamada al modelo (prompt, tools, pasos, streaming). `contexto.ts`: qué parte de la conversación ve el modelo. `medicion.ts`: modelo, tools, tokens y demora de cada respuesta. `streams.ts`: cómo viajan los errores por el stream. `erroresAsistente.ts`: qué ve la persona si falla. `titulador.ts`: el título de cada conversación. `systemPrompt.ts`. Cada tool en su archivo (`<nombre>.tool.ts`), registradas en `asistente.tools.ts`.                                                                                                                                                                                     | servicios, dominio, lib                        |
| Infraestructura | `src/backend/lib/` (env, supabase, openai, dolar, firma, registro)          | Clientes y adaptadores de servicios externos: `dolar/` (cliente de dolarapi.com con reintentos, caché, validación y fallos), `firma.ts` (firma de las respuestas del asistente), `registro.ts` (log en JSON).                                                                                                                                                                                                                                                                                                                                                                                                                                     | dominio (solo su vocabulario)                  |
| Frontend        | `src/frontend/`                                                             | Componentes React y lógica de presentación, por tema: `autenticacion/`, `compartidos/` y `chat/` (`conversacion/`, `estado/`, `sidebar/`, `resumen/`, `debug/`, `compartidos/`). Los datos llegan por props y las acciones como Server Actions. La lógica pura va en archivos `.ts` (testeables sin navegador).                                                                                                                                                                                                                                                                                                                                   | otras vistas                                   |
| Compartido      | `src/shared/`                                                               | Lógica pura que usan el servidor y el navegador (ej. el tipo de los mensajes del chat, el contrato de errores).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | solo tipos de otras librerías                  |

## Rutas (URLs)

En Next.js cada URL la define una carpeta de `src/app/` (no hay un archivo de rutas como en Express). Para que los textos de
las URLs no estén escritos a mano por todos lados, salen todos de `src/shared/rutas.ts` (`RUTAS`, `rutaDeConversacion`,
`RUTA_DE_LOGIN_FALLIDO`…), que usan las páginas, las acciones, los componentes y los tests.

| URL                  | Archivo que la atiende               | Qué hace                                                                          |
| -------------------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| `/`                  | `src/app/page.tsx`                   | Sin sesión: la bienvenida con «Ingresar con Google». Con sesión: lleva a un chat. |
| `/?error=login`      | `src/app/page.tsx`                   | La bienvenida con el aviso de que falló el login.                                 |
| `/conversacion/<id>` | `src/app/conversacion/[id]/page.tsx` | Una conversación: nueva (todavía sin guardar) o guardada.                         |
| `POST /api/chat`     | `src/app/api/chat/route.ts`          | Un mensaje al asistente; la respuesta vuelve en streaming.                        |
| `GET /auth/callback` | `src/app/auth/callback/route.ts`     | La vuelta del login de Google: canjea el código por la sesión.                    |

Las acciones que el navegador dispara sin cambiar de URL son Server Actions: `src/app/auth/actions.ts` (ingresar, cerrar
sesión) y `src/app/conversacion/actions.ts` (leer, borrar y titular una conversación).

## Autenticación, autorización y datos

- **Autenticación:** Supabase Auth (Google). `AuthController` es un envoltorio fino; no hay JWT, passwords ni tokens propios.
  Si Supabase Auth no responde, es un error (`AuthNoRespondeError`), no «sesión vencida».
- **Autorización:** RLS en todas las tablas (cada persona ve y toca solo lo suyo), `anon` sin acceso a ninguna tabla y
  la ruta exige sesión (401). La app nunca usa la `service_role` key.
- **Datos:** PostgreSQL de Supabase, con el cliente creado por request con las cookies de la persona. El esquema está en las
  migraciones de `src/backend/supabase/migrations/` (esquema inicial, cuota de uso y firma de mensajes).
- **Cuota de uso:** cada mensaje del chat y cada título gastan crédito de OpenAI. La cuenta la hace la función
  `consumir_cuota` de la base, en un solo paso y con un candado por persona, sobre la tabla `uso_del_asistente`, que la
  persona no puede leer ni borrar. Así no se recupera cuota borrando conversaciones y varios pedidos a la vez no se pasan
  del límite (`UsoModel`).
- **Modelo de lenguaje:** se crea en un solo lugar, `lib/openai.ts` (`modeloDeOpenAI`): la primera vez que se pide, con
  las variables de entorno, y después se reusa. Lo piden solo el agente y el titulador (`asistente/`); controllers y
  servicios no saben de OpenAI. El controller del chat llama a `agente.verificarConfiguracion()` antes de guardar nada,
  así una clave faltante corta el pedido con un error claro.
- **Respuestas firmadas:** la persona puede insertar filas en `mensajes` de sus conversaciones (el servidor guarda con su
  sesión). Para que no pueda inventarle al modelo respuestas «del asistente», el servidor las firma con una clave que solo
  conoce él (`FIRMA_DE_MENSAJES`, HMAC sobre el contenido) y, al armar lo que ve el modelo, descarta las que no tienen firma
  válida (`ConversacionesModel.mensajesConfiables`). Además, cada mensaje se valida con el validador del AI SDK y las tools
  reales antes de dárselo al modelo. La persona sigue viendo todo lo guardado al reabrir la conversación.

## Reglas de dependencia (en `eslint.config.mjs`)

1. `src/frontend/` no importa `src/backend/` ni `@supabase/*`.
2. `src/backend/` no importa `src/app/` ni `src/frontend/`.
3. `src/app/` no usa Supabase, los repositorios ni el agente directamente: pasa por un controller.
4. El dominio no importa Next, Supabase, el AI SDK ni `src/backend/lib/` (solo `import type`).
5. Los módulos del servidor empiezan con `import "server-only"`: si un Client Component los importa, el build falla.
   Excepciones: `lib/env.ts`, `lib/validacionLib.ts` y `lib/erroresLib.ts`, que también usa el middleware (Edge).
6. Solo `src/backend/lib/env.ts` lee `process.env`: cada servicio externo valida sus variables con Zod (en `validacionLib.ts`) al usarlas.
7. `src/shared/` no importa backend, frontend, rutas ni SDKs (salvo `import type`).
8. El contrato del chat vive en `src/shared/chat.ts`: `AsistenteUIMessage` se deriva de las tools reales
   (`crearToolsAsistente`). Si una tool cambia de nombre, datos o resultado, la vista deja de compilar.
9. Un controller no importa otro controller, y tampoco lo hacen los servicios ni las tools: lo que comparten dos
   puntos de entrada va a `src/backend/servicios/`.

Además (por convención, todavía sin regla de ESLint): los controllers y servicios no importan `lib/supabase`, y las tools no importan
los repositorios.

## Validación y errores

- **Lo que manda el navegador** se valida con Zod en `src/backend/controllers/validacionControllers.ts`.
- **Lo que manda el LLM a una tool** se valida con el `inputSchema` de la tool (`src/backend/tools/validacionTools.ts`), y los movimientos otra vez en el dominio
  (`leerDatosDeMovimiento` / `validarDatosDeMovimiento` en `validacionDominio.ts`) antes de guardarlos. La base tiene además sus propios `check`.
- **Lo que responde dolarapi.com** se valida con Zod en `src/backend/lib/dolar/validacionDolar.ts` (solo las casas que usa la
  app) antes de usarlo; sus fallas se arman en `src/backend/lib/dolar/erroresDolar.ts`.
- **Errores**: código estable en `src/shared/erroresShared.ts`, `ErrorDeAplicacion` en `src/backend/erroresBackend.ts` (sin status HTTP) y
  `src/app/api/respuestaDeError.ts` como único lugar que lo traduce a HTTP.
- **Las tools no lanzan:** devuelven `{ ok: false, motivo, detalle }` para que el modelo se lo explique a la persona. Si algo
  falla por dentro (la base, un bug), `tools/ejecutarSinLanzar.ts` lo deja en el log y devuelve `motivo: "error_interno"`.
- **Resultados que pueden fallar sin lanzar:** `Resultado<Datos, Fallo>` y `fallo()` en `lib/erroresLib.ts`.
- **Log:** `lib/registro.ts`, una línea de JSON por evento. No se loguean datos de la persona (montos, descripciones).

## Organización de validaciones y errores

- Toda carpeta que valida datos tiene `validacion<Carpeta>.ts` (todo el `zod` de la carpeta) y toda carpeta que lanza
  errores tiene `errores<Carpeta>.ts` (todas las clases de error y los `throw`). Se crean cuando hacen falta: una carpeta
  que no valida ni lanza nada (por ejemplo, de componentes) no los tiene. Los demás archivos solo importan y llaman sus
  funciones; el `throw` se hace con una función que devuelve `never` (ej. `lanzarPedidoInvalido`).
- Las tools no conocen los modelos: piden todo a un servicio (`MovimientosServicio` o `CotizacionesServicio`). Una tool es un
  adaptador entre el modelo de lenguaje y el servicio: define qué ve el LLM (descripción e `inputSchema`) y le pasa el pedido
  al servicio, que tiene las reglas. Controllers y servicios nombran sus modelos `modelo<Entidad>` (`modeloConversaciones`,
  `modeloMovimientos`, `modeloUso`, `modeloAuth`).

## Plata y fechas

- **Montos:** `numeric` en la base y aritmética en centavos enteros en el dominio (nunca floats sueltos). El monto máximo es
  el que entra en la base (`numeric(14,2)`).
- **Dólares:** se guarda el monto original y el monto en pesos con la cotización del día del registro (docs/adr/0001).
- **Fechas:** `"AAAA-MM-DD"` en hora de Argentina, entre 1900 y 2100; el "hoy" entra por parámetro, así los tests son
  deterministas. Una fecha futura solo si la plata se mueve ese día (un cheque diferido); lo decide el asistente, que
  pregunta. Un período con «hasta» y sin «desde» no se adivina: se pregunta desde cuándo (con la opción «desde hoy»).
- **Promedio diario de gastos:** sobre todos los días del período (para un mes, sus 28 a 31 días).

## Frontend: estado, tema y accesibilidad

- **Estado del chat** en tres contextos (`frontend/chat/estado/`): `ContextoDelChat` (mensajes, conversación abierta,
  enviar), `ContextoDelBorrador` (lo que se está escribiendo: cada letra vuelve a dibujar solo el campo) y
  `ContextoDePaneles` (menú, balance y debug abiertos).
- **Colores con tokens** (`src/app/globals.css`): cada color tiene un nombre por lo que hace (`fondo`, `superficie`,
  `tinta`, `borde-control`, `marca`, `enlace`, `peligro`…) y un valor para tema claro y otro para oscuro
  (`prefers-color-scheme`). Todos los pares de texto y fondo cumplen WCAG AA en los dos temas. Los componentes usan las
  clases de los tokens (`bg-superficie`, `text-tinta-suave`…), nunca colores sueltos de Tailwind.
- **Tamaño de letra** (`frontend/compartidos/tamanoDeLetra.ts`): una barra del 85 % al 130 % (de a 5 %) en una ventanita
  que se abre desde el menú de la cuenta (`DialogoDeTamanoDeLetra`). Cambia la letra base de `<html>` (todo está en rem,
  así que crece o se achica parejo), se guarda en `localStorage` y un script en el `<head>` la aplica antes de dibujar la
  página. Lo guardado se valida (`validacionCompartidos.ts`): un valor fuera de rango queda en 100 %.
- **Estados:** carga de la página (`loading.tsx`), «Abriendo la conversación…», «Actualizando…» y «Reintentar» en el panel
  «Este mes», errores del asistente con su código y, cuando tiene sentido, «Reintentar».

## Tests

- **Unitarios e integración (Vitest):** los del backend en `src/backend/tests/` (`unitarios/`, sin Docker ni internet;
  `integracion/supabase/`, contra la Supabase local de Docker; `integracion/http-local/`, contra servidores HTTP falsos en
  esta máquina) y los del frontend en `src/frontend/tests/`. `npm test`.
- **De punta a punta (Playwright):** en `e2e/*.spec.ts`, solo los flujos críticos. Levantan su propio Next (puerto 3100,
  build en `.next-e2e`) contra la Supabase local y un OpenAI y un dolarapi.com falsos (`e2e/servidores/falsos.mjs`). Cada
  test arranca con una persona nueva. `npm run test:e2e`.
- Ningún test llama al LLM ni a una API real, ni usa una base remota. Los archivos `validacion*` y `errores*` no tienen tests
  propios: se prueban a través de quienes los usan, verificando la clase del error.

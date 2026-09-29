# Arquitectura

MVC sobre Next.js (App Router) + Supabase, con reglas de dependencia que se hacen cumplir solas
(`npm run lint` y el build fallan si alguien las rompe).

## Capas

| Capa            | Carpeta                                                                                 | Qué hace                                                                                                                                                       | Puede usar                             |
| --------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Rutas           | `app/`                                                                                  | Páginas, Route Handlers y Server Actions. Finas: sesión, validación de entrada, delegar.                                                                       | controllers, dominio, views            |
| Controllers     | `backend/controllers/`                                                                  | Casos de uso: orquestan repositorios, dominio y el asistente. No saben de HTTP (salvo el stream del chat, que es el contrato del AI SDK).                      | repositorios, dominio, tools, lib      |
| Repositorios    | `backend/models/repositorios/` (conversaciones, movimientos)                            | Únicos que consultan Supabase (con `datosOError` de `lib/supabase/consultas.ts`). Sin interfaces: una sola implementación y los tests usan la base local real. | lib/supabase                           |
| Dominio         | `backend/models/dominio/` (movimiento, periodo, estadisticas, usuario, limiteDeUso)     | Lógica pura: qué es un movimiento, los períodos, el balance y las estadísticas.                                                                                | Zod, **solo tipos** de otras librerías |
| Asistente (LLM) | `backend/asistente/`, `backend/tools/`, `backend/lib/prompts/`, `backend/lib/openai.ts` | `asistente/agente.ts`: la llamada al modelo (prompt, tools, pasos, streaming, log). `asistente/errores.ts`: qué ve la persona si falla.                        | repositorios, dominio, lib             |
| Infraestructura | `backend/lib/` (env, supabase, openai, dolar)                                           | Clientes y adaptadores de servicios externos (dolarapi.com en `dolar.ts`).                                                                                     | —                                      |
| Views           | `views/`                                                                                | Componentes React. Los datos llegan por props y las acciones como Server Actions. La lógica pura va en archivos `.ts` (testeables sin navegador).              | otras views                            |
| Compartido      | `shared/`                                                                               | Lógica pura que usan el servidor y el navegador (ej. el tipo de los mensajes del chat).                                                                        | solo tipos de otras librerías          |

## Autenticación, autorización y datos

- **Autenticación:** Supabase Auth (Google). `AuthController` es un envoltorio fino; no hay JWT, passwords ni tokens propios.
- **Autorización:** RLS en todas las tablas (cada persona ve y toca solo lo suyo), `anon` sin acceso a ninguna tabla y
  la ruta exige sesión (401). La app nunca usa la `service_role` key.
- **Datos:** PostgreSQL de Supabase, con el cliente creado por request con las cookies de la persona. El esquema completo
  está en una sola migración (`backend/supabase/migrations/`).

## Reglas de dependencia (en `eslint.config.mjs`)

1. `views/` no importa `backend/` ni `@supabase/*`.
2. `backend/` no importa `app/` ni `views/`.
3. `app/` no usa Supabase, los repositorios ni el agente directamente: pasa por un controller.
4. El dominio no importa Next, Supabase, el AI SDK ni `backend/lib/` (solo `import type`).
5. Los módulos del servidor empiezan con `import "server-only"`: si un Client Component los importa, el build falla.
6. Solo `backend/lib/env.ts` lee `process.env`: cada servicio valida sus variables con Zod al usarlas.
7. `shared/` no importa backend, views, rutas ni SDKs (salvo `import type`).
8. El contrato del chat vive en `shared/chat.ts`: `AsistenteUIMessage` se deriva de las tools reales
   (`crearToolsAsistente`). Si una tool cambia de nombre, datos o resultado, la vista deja de compilar.

## Validación y errores

- **Lo que manda el navegador** se valida con Zod en `backend/controllers/validaciones.ts`.
- **Lo que manda el LLM a una tool** se valida con el `inputSchema` de la tool, y los movimientos otra vez en el dominio
  (`DatosDeMovimientoSchema`) antes de guardarlos. La base tiene además sus propios `check`.
- **Lo que responde dolarapi.com** se valida con Zod en `backend/lib/dolar.ts` antes de usarlo.
- **Errores**: código estable en `shared/errores.ts`, `ErrorDeAplicacion` en el backend (sin status HTTP) y
  `app/api/respuestaDeError.ts` como único lugar que lo traduce a HTTP. Las tools no lanzan: devuelven `{ ok: false, motivo }`
  para que el modelo se lo explique a la persona.

## Plata y fechas

- **Montos:** `numeric` en la base y aritmética en centavos enteros en el dominio (nunca floats sueltos).
- **Dólares:** se guarda el monto original y el monto en pesos con la cotización del día del registro (docs/adr/0001).
- **Fechas:** `"AAAA-MM-DD"` en hora de Argentina; el "hoy" entra por parámetro, así los tests son deterministas.

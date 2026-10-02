# Reglas del proyecto para Claude Code

Este archivo define: (1) dónde están las skills y cuándo usarlas, (2) la organización obligatoria de validaciones y errores, (3) las reglas de testing, (4) cómo auditar tests y frontend, (5) el uso de ARQUITECTURA.md y (6) el cierre de toda tarea.
Sugerencia: referencialo desde `CLAUDE.md` con `@REGLAS-SKILLS.md`.

---

## 1. Dónde están las skills

- Las skills **no están en el repositorio**: se instalan en cada máquina (como `node_modules`) y git las ignora (`.claude/skills/`, `.agents/`, `skills-lock.json`). Son material de terceros, cada una con su licencia.
- Registro local de skills instaladas: `skills-lock.json` (raíz del proyecto, ignorado por git).
- Archivos de cada skill (cada una tiene su propio `SKILL.md`): `.claude/skills/<nombre-skill>/SKILL.md`. Si no existe esa ruta, buscar en `.agents/skills/<nombre-skill>/SKILL.md` o en `~/.claude/skills/<nombre-skill>/SKILL.md`. Si no se encuentra, avisar en lugar de inventar su contenido y seguir las reglas de este archivo.
- Este archivo (`REGLAS-SKILLS.md`) es el único índice de skills y reglas; `CLAUDE.md` lo importa con `@REGLAS-SKILLS.md`.
- Antes de empezar una tarea, leer el `SKILL.md` de las skills que apliquen y seguir sus instrucciones.
- Si una skill contradice las secciones 2 o 3 de este archivo, **gana este archivo**.

## 2. Validaciones y errores en archivos aparte (OBLIGATORIO)

Cada carpeta con lógica (módulo, feature, servicio) tiene dos archivos dedicados, con el nombre de la carpeta en PascalCase:

- `validacion<NombreCarpeta>.ts`: TODAS las validaciones con Zod de esa carpeta.
- `errores<NombreCarpeta>.ts`: TODOS los errores y lanzamientos (`throw`) de esa carpeta.

```
usuarios/
├── usuariosService.ts
├── usuariosService.test.ts     ← test del servicio (ver sección 3)
├── usuariosController.ts
├── validacionUsuarios.ts       ← schemas Zod + funciones de validación
└── erroresUsuarios.ts          ← clases de error + funciones que lanzan
```

**validacion<NombreCarpeta>.ts**
- Schemas de Zod y tipos inferidos (`z.infer`).
- Funciones de validación exportadas, por ejemplo `validarCrearUsuario(input: unknown)`.
- Si la validación falla, no lanza directamente: llama a una función de `errores<NombreCarpeta>.ts`.

**errores<NombreCarpeta>.ts**
- Clases de error propias de la carpeta.
- Funciones que lanzan, tipadas con `never`:
  ```ts
  export function lanzarUsuarioNoEncontrado(id: string): never {
    throw new UsuarioNoEncontradoError(id);
  }
  ```

**Prohibido en los demás archivos de la carpeta**
- Importar `zod` o definir schemas.
- Escribir `throw new ...` o crear clases de error.
- Solo se importan y llaman las funciones de esos dos archivos.
- Un `try/catch` puede estar en cualquier archivo, pero el error lanzado siempre viene de `errores<NombreCarpeta>.ts`.

**Reglas operativas**
- Los dos archivos se crean cuando la carpeta tiene algo propio que validar o un error propio. No se dejan archivos vacíos (solo `export {}`): una carpeta de componentes que no valida ni lanza nada no los necesita.
- Código existente con `zod` o `throw` inline: moverlo a estos archivos como parte del cambio.
- Código compartido entre carpetas: `src/shared/` (o `common/`) con `validacionShared.ts` y `erroresShared.ts`.

## 3. Testing

### 3.1 Stack
- **Unitarios e integración:** Vitest (Jest solo si el proyecto ya lo usa).
- **End to end (E2E):** Playwright, en la carpeta `e2e/` con archivos `*.spec.ts`.
- Los tests unitarios e integración van en carpetas propias, no junto al archivo que prueban:
  - backend: `src/backend/tests/unitarios/` (sin Docker ni internet) y `src/backend/tests/integracion/` (`supabase/` contra la base local, `http-local/` contra servidores HTTP locales);
  - frontend: `src/frontend/tests/`.
  - Cada archivo se llama `<lo que prueba>.test.ts(x)`.
- **Base de datos (Supabase):** los tests de persistencia corren contra una instancia local en Docker (ver 3.5), no contra mocks ni contra el proyecto real.

### 3.2 Qué se testea y qué no
- **NO se crean tests para `validacion<NombreCarpeta>.ts` ni `errores<NombreCarpeta>.ts`.**
- Se testean las funciones donde se usan (servicios, controladores, handlers, tools), comprobando que ante entradas inválidas o fallos **lanzan el error esperado** (verificar la clase del error, no solo que "falla algo").
- Esos archivos quedan cubiertos de forma indirecta; no se los excluye de la cobertura.
- Cada tarea que agregue o cambie una funcionalidad debe incluir sus tests unitarios/integración. Si es un flujo de usuario completo, también un test E2E.

### 3.3 Pirámide de testing
- Muchos tests unitarios, menos de integración, pocos E2E (son los más caros y lentos).
- E2E solo para flujos críticos de usuario de punta a punta (por ejemplo: enviar un mensaje, ver carga, ver respuesta, ver error, persistencia del historial).

### 3.4 Cómo diseñar los casos (criterio de la materia de testing)
- **Objetivo:** encontrar fallas, no demostrar que no las hay. Un test es valioso si intenta romper el código, no solo si cubre el camino feliz.
- **Resultado esperado definido de antemano.** Todo test tiene aserciones explícitas. Prohibido copiar la salida actual del código como expected, y prohibido replicar la lógica del código dentro del test (mismo error en ambos = falsa confianza).
- **Partición de equivalencia:** dividir las entradas en clases válidas e inválidas y probar un representante de cada una.
  - Rango de valores: 1 clase válida + 2 inválidas.
  - Conjunto de valores: 1 válida + 1 inválida.
  - Condición "debe ser": 1 válida + 1 inválida.
- **Valores borde:** probar en los extremos y junto a ellos (ej.: rango 1000 a 8000 → 999, 1000, 1001, 7999, 8000, 8001). Aplicar también a salidas, y a colecciones vacías, primer y último elemento.
- **Clases inválidas de otro tipo:** tipo de dato equivocado, fechas inválidas, integridad de datos (dominio, entidad, relación) y condiciones cruzadas entre campos.
- **Conjetura de errores:** reforzar donde hay sospecha: código hecho a las apuradas, modificado por varias personas, condiciones anidadas o compuestas, copy-paste.
- **Caja blanca:** cubrir todas las decisiones (cada salida de un `if`/`while`) y, en condiciones compuestas (`A && B`), cada expresión. Usar la complejidad ciclomática V(g) = aristas − nodos + 2 como mínimo de casos por función compleja.
- **Combinar técnicas.** Ninguna alcanza sola.
- **Regresión:** cada bug corregido lleva un test que lo reproduce. Reusar casos existentes en lugar de descartarlos.

### 3.5 Aislamiento de dependencias externas
- **Por defecto se mockea.** Los tests unitarios, de integración y la suite E2E principal no llaman al LLM ni a APIs reales. Se mockean (por ejemplo con MSW o mocks de Vitest; en E2E con `page.route` de Playwright).
- Motivo: el LLM no es determinista, las llamadas reales cuestan y son lentas, dependen de la red y de terceros, y no se pueden provocar a demanda errores como 429, timeouts o respuestas inválidas.
- Probar explícitamente los fallos de integraciones: error HTTP, rate limit, timeout y respuesta con formato inválido (validada con Zod).
- **Base de datos (Supabase): NO se mockea, se prueba contra una instancia local en Docker.**
  - Usar Supabase CLI (`supabase start`, levanta el stack local en Docker) o, si solo se necesita Postgres, un contenedor de Postgres (por ejemplo con Testcontainers).
  - Motivo: un mock del cliente no detecta errores de SQL, constraints, migraciones ni políticas RLS, y da falsa confianza.
  - Aplicar las migraciones reales antes de correr los tests y dejar la base en estado limpio entre tests (`supabase db reset`, `TRUNCATE` o transacciones con rollback).
  - Las variables de entorno de test apuntan siempre a la instancia local. Prohibido correr tests contra el proyecto Supabase de producción o de desarrollo compartido.
  - Se testean con la base real los repositorios/funciones de acceso a datos (integración). Los tests unitarios de servicios y tools mockean el repositorio, no la base.
  - Los E2E también pueden usar la base local.
- **Excepción permitida (este proyecto no la usa):** una suite opcional de "smoke tests" con llamadas reales, separada (por ejemplo `npm run test:real`, archivos `*.real.test.ts`). Sirve para verificar que el contrato con la API, el prompt y los schemas siguen funcionando con respuestas reales. Acá esa verificación se hace probando la app en local con OpenAI real.
  - Esta suite NO corre en la ejecución por defecto ni en CI.
  - Se ejecuta solo de forma manual o cuando se pida explícitamente.
  - Lee las claves desde variables de entorno, nunca desde el código.
  - No reemplaza a los tests con mocks: los casos de error siempre se prueban con mocks.

### 3.6 Secretos
- Nunca escribir claves o tokens en el código, en tests, en `CLAUDE.md` ni en este archivo. Usar variables de entorno, `.env` (ignorado por git) y un `.env.example` con los nombres de las variables y sin valores.
- Si aparece una clave real en un documento o en el repo, avisar y tratarla como comprometida.

## 4. Auditorías

### 4.1 Auditoría de tests
Con la skill `testing-best-practices` y este checklist:
1. ¿Hay test para cada función pública y cada rama de error? ¿Se verifica la clase del error?
2. ¿Hay partición de equivalencia, bordes, tipos inválidos y condiciones cruzadas?
3. ¿Cada test tiene resultado esperado explícito e independiente del código?
4. ¿Hay tests que repiten la lógica del código o que pasan siempre?
5. ¿Se cubren decisiones y condiciones, y no solo sentencias?
6. ¿Hay test de regresión para bugs corregidos?
7. ¿Se respeta la pirámide? ¿Los E2E cubren solo flujos críticos?
8. Cuando un test falla: ¿es un defecto del código, del test o del ambiente? (un incidente no siempre es una falla del software).
9. ¿Se mockean las dependencias externas?
La auditoría se hace con contexto separado del que escribió el código (subagente o sesión aparte), porque quien programa tiende a no ver sus propios errores.
Resultado: informe con hallazgos por severidad y propuesta de correcciones. No se modifican tests durante la auditoría salvo pedido explícito.

### 4.2 Auditoría de frontend
Usar `web-design-guidelines` (accesibilidad, foco, formularios, animación, imágenes, rendimiento, navegación y estado, tema oscuro), `vercel-react-best-practices` (rendimiento) y `frontend-design` (calidad visual). Además verificar:
- Estados de carga, error y éxito claramente diferenciados.
- Validación de inputs del usuario con mensajes útiles.
- Accesibilidad: etiquetas ARIA, navegación por teclado, contraste.
- Flujos críticos cubiertos por E2E con Playwright.

## 5. Cuándo usar cada skill

| Skill | Usarla cuando... | Ruta |
|---|---|---|
| `api-designer` | Se crean o modifican endpoints, contratos de API, códigos HTTP, versionado | `.claude/skills/api-designer/SKILL.md` |
| `architecture-patterns` | Se decide la estructura general o se agrega un módulo grande | `.claude/skills/architecture-patterns/SKILL.md` |
| `backend-patterns` | Se escribe lógica de servidor: servicios, repositorios, middleware, caché | `.claude/skills/backend-patterns/SKILL.md` |
| `codebase-design` | Se diseñan módulos, límites e interfaces | `.claude/skills/codebase-design/SKILL.md` |
| `coding-standard` | **Siempre** al escribir o editar código | `.claude/skills/coding-standard/SKILL.md` |
| `domain-modeling` | Se definen entidades y reglas de negocio | `.claude/skills/domain-modeling/SKILL.md` |
| `error-handling` | Se trabaja con errores o fallos. Siempre junto con la sección 2 | `.claude/skills/error-handling/SKILL.md` |
| `improve-codebase-architecture` | Se pide refactorizar o mejorar la arquitectura | `.claude/skills/improve-codebase-architecture/SKILL.md` |
| `nextjs-data-fetching` | Fetching, caché o server components/actions en Next.js | `.claude/skills/nextjs-data-fetching/SKILL.md` |
| `react-patterns` | Componentes, hooks o estado en React | `.claude/skills/react-patterns/SKILL.md` |
| `react-testing` | Tests de componentes o hooks de React | `.claude/skills/react-testing/SKILL.md` |
| `tdd-workflow` | TDD o feature nueva escribiendo tests primero | `.claude/skills/tdd-workflow/SKILL.md` |
| `testing-best-practices` | Se escribe o revisa cualquier test | `.claude/skills/testing-best-practices/SKILL.md` |
| `typescript-pro` | Tipos, genéricos o errores de TypeScript | `.claude/skills/typescript-pro/SKILL.md` |
| `verification-loop` | **Al terminar cualquier tarea** | `.claude/skills/verification-loop/SKILL.md` |
| `web-design-guidelines` | Auditar UI: accesibilidad, UX, formularios, rendimiento | `~/.claude/skills/web-design-guidelines/SKILL.md` |
| `vercel-react-best-practices` | Auditar o escribir React/Next.js pensando en rendimiento | `~/.claude/skills/vercel-react-best-practices/SKILL.md` |
| `webapp-testing` | Escribir o correr tests E2E con Playwright y capturas | `.agents/skills/webapp-testing/SKILL.md` |
| `frontend-design` | Calidad visual del frontend | `.agents/skills/frontend-design/SKILL.md` |

### Combinaciones frecuentes
- **Feature de backend:** `domain-modeling` → `architecture-patterns` → `backend-patterns` → `api-designer` → `coding-standard` → `typescript-pro` → `testing-best-practices` → `verification-loop`
- **Feature con tests primero:** `tdd-workflow` + `testing-best-practices` + las de la feature
- **Componente React:** `react-patterns` → `coding-standard` → `react-testing` → `verification-loop`
- **Flujo E2E:** `webapp-testing` + `testing-best-practices`
- **Auditoría de tests:** checklist de la sección 4.1 + `testing-best-practices`
- **Auditoría de frontend:** `web-design-guidelines` + `vercel-react-best-practices` + `frontend-design`
- **Refactor:** `improve-codebase-architecture` + `codebase-design` + `architecture-patterns` + `verification-loop`
- **Errores o validaciones:** `error-handling` + sección 2 + `typescript-pro`

## 6. ARQUITECTURA.md: solo lectura

- Antes de cualquier cambio (feature, fix, refactor), leer `ARQUITECTURA.md` completo para entender la arquitectura y tenerlo presente durante toda la tarea.
- No modificar `ARQUITECTURA.md` por iniciativa propia: es de consulta. Se actualiza solo cuando se pide explícitamente (por ejemplo, después de un cambio de estructura que hay que documentar).
- Si no existe, avisar y proponer crearlo (o crearlo solo si se pide explícitamente).
- Si un cambio pedido contradice `ARQUITECTURA.md`, avisar antes de implementarlo.

## 7. Cierre de toda tarea

1. Ejecutar `verification-loop` (typecheck, lint, tests unitarios/integración, E2E si corresponde, build).
2. Confirmar que `ARQUITECTURA.md` fue leído al inicio y que el cambio lo respeta (y que solo se modificó si se pidió).
3. Confirmar que en las carpetas tocadas no quedó `zod` ni `throw` fuera de `validacion<NombreCarpeta>.ts` y `errores<NombreCarpeta>.ts`.
4. Confirmar que los tests por defecto no hacen llamadas reales a APIs externas ni al LLM, y que los de persistencia usan la base local en Docker (nunca una remota).
5. Confirmar que no se crearon tests de esos dos archivos y que sus errores se prueban a través de las funciones que los usan.
6. Confirmar que no hay secretos en el código.
7. Informar qué skills se usaron y qué se verificó.

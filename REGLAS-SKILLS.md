# Reglas del proyecto para Claude Code

Este archivo define (1) cuándo usar cada skill y dónde encontrarla, y (2) la regla obligatoria de organización de validaciones y errores.
Sugerencia: pegá este contenido en `CLAUDE.md` o referencialo desde ahí con `@REGLAS-SKILLS.md`.

---

## 1. Dónde están las skills

- Registro de skills instaladas: `skills-lock.json` (raíz del proyecto).
- Archivos de cada skill: `.claude/skills/<nombre-skill>/SKILL.md`
  - Si no existe esa ruta, buscar en `.agents/skills/<nombre-skill>/SKILL.md`.
- Regla general: **antes de empezar una tarea, leer el `SKILL.md` de las skills que apliquen** y seguir sus instrucciones. Si hay conflicto entre una skill y la sección 2 de este archivo, **gana este archivo**.

## 2. Regla obligatoria: validaciones y errores en archivos separados

Cada carpeta que contenga lógica (módulo, feature, servicio, etc.) debe tener **dos archivos dedicados**:

- `validacion<NombreCarpeta>.ts` → **todas** las validaciones con Zod de esa carpeta.
- `errores<NombreCarpeta>.ts` → **todos** los errores y lanzamientos (`throw`) de esa carpeta.

`<NombreCarpeta>` va en PascalCase. Ejemplo para la carpeta `usuarios/`:

```
usuarios/
├── usuariosService.ts
├── usuariosController.ts
├── usuariosRepository.ts
├── validacionUsuarios.ts   ← schemas Zod + funciones de validación
└── erroresUsuarios.ts      ← clases de error + funciones que lanzan
```

### Qué va en `validacion<NombreCarpeta>.ts`
- Todos los schemas de Zod (`z.object(...)`, etc.) y los tipos inferidos (`z.infer`).
- Funciones de validación exportadas, por ejemplo `validarCrearUsuario(input: unknown)`.
- Si la validación falla, la función **no lanza directamente**: llama a una función de `errores<NombreCarpeta>.ts`.

### Qué va en `errores<NombreCarpeta>.ts`
- Las clases de error propias de esa carpeta (`class UsuarioNoEncontradoError extends Error`).
- Funciones que lanzan, tipadas con `never`, por ejemplo:
  ```ts
  export function lanzarUsuarioNoEncontrado(id: string): never {
    throw new UsuarioNoEncontradoError(id);
  }
  ```

### Prohibiciones en los demás archivos de la carpeta
- **No importar `zod`** ni definir schemas fuera de `validacion<NombreCarpeta>.ts`.
- **No escribir `throw new ...`** ni crear clases de error fuera de `errores<NombreCarpeta>.ts`.
- Los demás archivos solo **importan y llaman** las funciones de esos dos archivos:
  ```ts
  import { validarCrearUsuario } from "./validacionUsuarios";
  import { lanzarUsuarioNoEncontrado } from "./erroresUsuarios";
  ```
- Un `try/catch` para capturar o traducir errores sí puede estar en cualquier archivo, pero el error que se lanza debe venir de `errores<NombreCarpeta>.ts`.

### Al crear una carpeta nueva
1. Crear `validacion<NombreCarpeta>.ts` y `errores<NombreCarpeta>.ts` desde el inicio, aunque estén casi vacíos.
2. Nunca dejar validaciones o `throw` "provisorios" en otros archivos.

### Al tocar código existente
Si un archivo tiene `zod` o `throw` inline, moverlos a los archivos correspondientes de su carpeta como parte del cambio.

### Código compartido
Si un error o validación se usa en varias carpetas, va en la carpeta compartida (`shared/` o `common/`) con sus propios `validacionShared.ts` y `erroresShared.ts`.

---

## 3. Cuándo usar cada skill

| Skill | Usarla cuando... | Ruta |
|---|---|---|
| `api-designer` | Se crean o modifican endpoints, rutas, contratos de API, códigos HTTP, versionado | `.claude/skills/api-designer/SKILL.md` |
| `architecture-patterns` | Se decide la estructura general (capas, hexagonal, clean) o se agrega un módulo grande | `.claude/skills/architecture-patterns/SKILL.md` |
| `backend-patterns` | Se escribe lógica de servidor: servicios, repositorios, middleware, caché, jobs | `.claude/skills/backend-patterns/SKILL.md` |
| `codebase-design` | Se diseñan módulos, límites e interfaces entre partes del código | `.claude/skills/codebase-design/SKILL.md` |
| `coding-standard` | **Siempre** al escribir o editar código (nombres, estilo, convenciones) | `.claude/skills/coding-standard/SKILL.md` |
| `domain-modeling` | Se definen entidades, reglas de negocio o el lenguaje del dominio | `.claude/skills/domain-modeling/SKILL.md` |
| `error-handling` | Se trabaja con errores, excepciones o respuestas de fallo. **Aplicar siempre junto con la sección 2** | `.claude/skills/error-handling/SKILL.md` |
| `improve-codebase-architecture` | Se pide refactorizar, revisar o mejorar la arquitectura existente | `.claude/skills/improve-codebase-architecture/SKILL.md` |
| `nextjs-data-fetching` | Se hace fetching, caché o server components/actions en Next.js | `.claude/skills/nextjs-data-fetching/SKILL.md` |
| `react-patterns` | Se crean o modifican componentes, hooks o estado en React | `.claude/skills/react-patterns/SKILL.md` |
| `react-testing` | Se escriben tests de componentes o hooks de React | `.claude/skills/react-testing/SKILL.md` |
| `tdd-workflow` | Se pide TDD o se implementa una feature nueva escribiendo tests primero | `.claude/skills/tdd-workflow/SKILL.md` |
| `testing-best-practices` | Se escribe o revisa cualquier test (estructura, mocks, cobertura) | `.claude/skills/testing-best-practices/SKILL.md` |
| `typescript-pro` | Se definen tipos, genéricos, utilidades de tipos o se corrigen errores de TS | `.claude/skills/typescript-pro/SKILL.md` |
| `verification-loop` | **Al terminar cualquier tarea**, antes de dar el trabajo por listo | `.claude/skills/verification-loop/SKILL.md` |

### Combinaciones frecuentes

- **Nueva feature de backend:** `domain-modeling` → `architecture-patterns` → `backend-patterns` → `api-designer` → `coding-standard` → `typescript-pro` → `verification-loop`
- **Nueva feature con tests primero:** `tdd-workflow` + `testing-best-practices` + las de la feature
- **Componente React:** `react-patterns` → `coding-standard` → `react-testing` → `verification-loop`
- **Página o data en Next.js:** `nextjs-data-fetching` + `react-patterns` + `verification-loop`
- **Refactor:** `improve-codebase-architecture` + `codebase-design` + `architecture-patterns` + `verification-loop`
- **Manejo de errores o validaciones:** `error-handling` + sección 2 de este archivo + `typescript-pro`

## 4. ARQUITECTURA.md: solo lectura

- **Antes de hacer cualquier cambio** (feature, fix, refactor), leer `ARQUITECTURA.md` (raíz del proyecto) completo para entender cómo está armada la arquitectura, y tenerlo presente durante toda la tarea. Los cambios deben respetar lo que dice.
- **No modificar ni actualizar** `ARQUITECTURA.md` al hacer cambios. Es solo de consulta; lo edita la persona.
- Si `ARQUITECTURA.md` no existe, avisar y proponer crearlo (o crearlo solo si se pide explícitamente).
- Si un cambio pedido contradice `ARQUITECTURA.md`, avisar antes de implementarlo.

## 5. Cierre de toda tarea

1. Ejecutar el flujo de `verification-loop` (typecheck, lint, tests, build según corresponda).
2. Confirmar que `ARQUITECTURA.md` fue leído al inicio y que el cambio lo respeta (sin haberlo modificado).
3. Confirmar que en las carpetas tocadas no quedó `zod` ni `throw` fuera de `validacion<NombreCarpeta>.ts` y `errores<NombreCarpeta>.ts`.
4. Informar qué skills se usaron y qué se verificó.
# Administrador de Finanzas

Asistente de finanzas personales para Argentina. Le contás tus gastos e ingresos como se los contarías a alguien
(«gasté 85.000 en el súper con débito», «pagué 15 dólares de Spotify con la tarjeta») y los registra, te dice en qué se
te va la plata y a cuánto está el dólar. Es un chat con un modelo de lenguaje (OpenAI) que decide qué herramientas usar
sobre tus datos guardados en Supabase y sobre las cotizaciones de [dolarapi.com](https://dolarapi.com).

**Demo:** [https://administrador-de-finanzas-mspadoni.vercel.app](https://administrador-de-finanzas-oh5ry287w-mspadoni.vercel.app/) (se entra con una cuenta de Google).

**Video demo (recorrido por la app):** https://youtu.be/8iwNAZyjZMU

![Registrar gastos conversando](docs/capturas/registrar-gastos.png)

**[Ver todas las capturas, explicadas una por una →](docs/CAPTURAS.md)**

## Índice

- [El bot](#el-bot)
- [User stories](#user-stories)
- [Cómo cumple el challenge](#cómo-cumple-el-challenge)
- [Features bonus](#features-bonus)
- [Arquitectura](#arquitectura)
- [El recorrido de un mensaje](#el-recorrido-de-un-mensaje)
- [Decisiones técnicas y trade-offs](#decisiones-técnicas-y-trade-offs)
- [Uso de IA](#uso-de-ia)
- [Instalación local](#instalación-local)
- [Scripts de npm](#scripts-de-npm)
- [Tests](#tests)
- [Deploy](#deploy)

## El bot

**Problema que resuelve.** Mucha gente quiere saber en qué se le va la plata, pero abandona las planillas y las apps de
gastos porque cargar cada cosa es tedioso: elegir categoría, fecha, medio de pago, y en Argentina además convertir los
dólares a mano con la cotización que corresponda (oficial, blue, MEP o tarjeta, que pueden ser muy distintas).

**Público objetivo.** Personas en Argentina que manejan su plata en pesos y en dólares y quieren ordenar sus gastos sin
volverse contadores: no saben (ni quieren saber) de planillas, pero sí quieren poder responder «¿cómo vengo este mes?».

**Propuesta de valor.** Cargar un gasto es escribir una frase. El asistente entiende qué pasó, pregunta solo lo que
falta (nunca inventa el medio de pago ni una categoría dudosa), convierte los dólares con la cotización del día citando
la fuente, y resume el mes con números que salen de la base de datos, no de la imaginación del modelo.

### Qué hace

- **Registra movimientos** (gastos e ingresos, en pesos o en dólares) a partir de lo que escribís. Cada registro se
  muestra como una tarjeta con lo que quedó guardado, para que puedas verificarlo.
- **Consulta y resume:** los movimientos de un período, el balance, los gastos por categoría, el promedio diario y la
  comparación con el período anterior. El panel «Este mes» se actualiza solo cada vez que el asistente registra o
  borra algo.
- **Dólar:** cotización oficial, blue, MEP y tarjeta, y conversiones entre pesos y dólares.
- **Borra movimientos,** siempre después de confirmar con vos cuál.
- **Conversaciones guardadas:** cada charla tiene un título (lo propone el modelo según de qué se habló), se puede volver
  a abrir desde cualquier dispositivo y se puede borrar (con confirmación y, por unos segundos, con «Deshacer»).
- **Tamaño de letra:** una barra (del 85 % al 130 %) en el menú de la cuenta, para achicar o agrandar toda la página; se
  recuerda.
- **Panel de debug:** para cada respuesta muestra qué herramientas decidió usar el modelo (con sus datos y resultados),
  el modelo, los tokens y la demora.

### Las herramientas (tools) del asistente

Una _tool_ es una función del servidor que el modelo puede pedir que se ejecute. El modelo no ejecuta nada por su cuenta:
recibe la lista de tools con su descripción y qué datos esperan, y en cada respuesta decide si necesita alguna (y cuál,
con qué datos). El servidor valida esos datos, ejecuta la función y le devuelve el resultado al modelo, que con eso
arma la respuesta. Acá el modelo decide solo (`toolChoice: "auto"`), con hasta 8 pasos por respuesta (por ejemplo,
consultar movimientos y después borrar uno).

| Tool                    | Qué hace                                                                                             | Por qué existe                                                                                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registrar_movimiento`  | Guarda un gasto o ingreso: monto, moneda, categoría, medio de pago, descripción y fecha.             | Es la razón de ser del bot: convertir una frase en un registro ordenado. Si es en dólares busca la cotización del día y guarda también el monto en pesos, para que todo se pueda sumar en una misma moneda.                   |
| `consultar_movimientos` | Lista los movimientos de un período (con filtros por tipo y categoría) y sus totales.                | Para «¿qué gasté esta semana?» y para encontrar el movimiento exacto (su id) antes de borrarlo: el modelo nunca borra «a ciegas».                                                                                             |
| `estadisticas`          | Balance, gastos por categoría, promedio diario y variación contra el período anterior.               | Responde la pregunta que más importa («¿cómo vengo?»). Las cuentas las hace código propio, no el modelo: un LLM puede equivocarse sumando o calculando porcentajes, y acá un error de cuentas es justo lo que no puede pasar. |
| `borrar_movimiento`     | Borra un movimiento por su id.                                                                       | Para corregir errores («ese gasto lo cargué dos veces»). Solo se usa después de que la persona confirmó cuál borrar.                                                                                                          |
| `cotizacion_dolar`      | La cotización (compra y venta) del dólar oficial, blue, MEP y tarjeta, con la hora de actualización. | En Argentina «el dólar» son varios y cambian todos los días: la persona necesita el dato real, con su fuente, y el modelo no puede saberlo de memoria.                                                                        |
| `convertir`             | Pasa un monto de pesos a dólares o al revés con la cotización actual (a valor de compra y de venta). | Para «¿cuánto son 200 dólares blue?» sin que el modelo haga la cuenta: la hace el código con la cotización real.                                                                                                              |

#### Por qué comparar con el período anterior

Un total suelto no dice mucho: «gastaste $ 167.030 este mes» no te dice si vas bien o mal. Comparado con el mes pasado
sí («vas 15 % arriba»): te avisa a tiempo que algo cambió y, mirando las categorías, en qué. Por eso `estadisticas`
trae siempre, además del período pedido, el anterior del mismo largo (el mes pasado, la semana pasada, o los días
inmediatamente anteriores de un rango), y si no hay datos para comparar lo dice en vez de inventar.

Ojo: la comparación es en pesos nominales. Con inflación, parte de una suba puede ser solo que los precios aumentaron;
ajustar por inflación está en las [mejoras futuras](#mejoras-futuras).

## User stories

**1. Registrar un gasto conversando**

```text
Como persona que quiere llevar sus gastos
Quiero contarle al asistente lo que gasté con mis palabras
Para no tener que completar un formulario por cada compra

Criterios de aceptación:
- [x] «Gasté 85.000 en el súper con débito» queda registrado como gasto de supermercado, con débito, con fecha de hoy.
- [x] Si falta el medio de pago o la categoría es ambigua («gasté 12.000 en hot dogs»), pregunta antes de registrar.
- [x] Cada registro se ve como una tarjeta con lo guardado y el panel «Este mes» se actualiza sin recargar la página.
- [x] Un monto inválido (cero, negativo, con más de dos decimales o más grande de lo que entra en la base) no se guarda
      y el asistente explica por qué.
- [x] Las fechas relativas («ayer», «el lunes») se entienden; una fecha futura solo si tiene sentido (un cheque diferido).
- [x] El asistente nunca dice «registrado» si la herramienta no lo guardó.
```

**2. Registrar gastos en dólares**

```text
Como persona que paga servicios en dólares
Quiero registrar un gasto en dólares sin buscar la cotización
Para saber cuánto me costó en pesos

Criterios de aceptación:
- [x] «Pagué 15 dólares de Spotify con la tarjeta» se guarda en US$ 15 y en pesos con el dólar tarjeta de ese día.
- [x] La respuesta dice qué cotización usó y cita la fuente (dolarapi.com).
- [x] Si dolarapi.com no responde, no se registra con una cotización inventada: el asistente avisa que no pudo.
```

**3. Entender en qué se va la plata**

```text
Como persona que llega justa a fin de mes
Quiero preguntar «¿en qué gasto más?» o «¿cómo vengo?»
Para decidir dónde recortar

Criterios de aceptación:
- [x] Responde con ingresos, gastos, balance, porcentaje por categoría y promedio diario del período.
- [x] Compara con el período anterior cuando hay datos, y lo dice cuando no los hay.
- [x] Los números salen de la base (la tool `estadisticas`), nunca del modelo.
- [x] «Este mes» está siempre a mano (al costado en la compu, en un cajón en el celular).
```

**4. Consultar el dólar**

```text
Como persona que ahorra o cobra en dólares
Quiero preguntar a cuánto está el dólar y convertir montos
Para tomar decisiones con la cotización del día

Criterios de aceptación:
- [x] «¿A cuánto está el blue?» muestra compra, venta, hora de actualización y fuente.
- [x] «¿Cuánto son 200 dólares MEP?» convierte con la cotización actual (compra y venta).
- [x] Si el servicio falla, tarda o limita los pedidos, el asistente lo explica en una línea en vez de inventar.
```

**5. Retomar una conversación**

```text
Como persona que usa la app desde el celular y la compu
Quiero que mis conversaciones y movimientos queden guardados
Para seguir donde dejé, desde cualquier dispositivo

Criterios de aceptación:
- [x] Al recargar o volver a entrar, la conversación sigue ahí, con sus tarjetas.
- [x] Cada conversación tiene un título y se puede borrar (con confirmación y unos segundos para deshacerlo).
- [x] Cada persona ve solo lo suyo, aunque conozca el id de una conversación ajena.
```

## Cómo cumple el challenge

| Requisito                              | Cómo                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Historial persistente                  | Conversaciones y mensajes guardados en Supabase (Postgres), por persona. Al reabrir una conversación se ve igual que cuando se dejó, con sus tarjetas.                                                                                                                                                                                                                      |
| Input con validación                   | No se puede mandar un mensaje vacío ni de más de 6000 caracteres: el navegador lo avisa y desactiva el botón, y el servidor lo vuelve a validar con Zod (nunca se confía solo en el navegador).                                                                                                                                                                             |
| Estados de carga, error y éxito        | Carga de la página, «Abriendo la conversación…», la respuesta apareciendo en vivo, tarjetas de éxito, «Actualizando…» en el panel, y errores con un mensaje útil y «Reintentar» cuando tiene sentido.                                                                                                                                                                       |
| Panel de debug (bonus)                 | Por respuesta: qué tools usó el modelo y en qué orden, con sus datos y resultados, el modelo, los pasos, los tokens de entrada y salida y la demora.                                                                                                                                                                                                                        |
| Interpretación de intención            | El modelo entiende si la persona quiere registrar algo, consultar, saber del dólar o algo fuera de tema, y en base a eso elige la tool (o ninguna).                                                                                                                                                                                                                         |
| Generación de respuesta                | Respuestas contextuales en español rioplatense, que tienen en cuenta lo que se habló antes en la conversación.                                                                                                                                                                                                                                                              |
| Estructuración de datos                | Para llamar a una tool el modelo arma un JSON con un formato fijo (por ejemplo `{ tipo, monto, moneda, categoria, medioDePago, … }`), que se valida con un esquema de Zod antes de ejecutar nada (ver [validaciones](#validaciones-antes-de-guardar)).                                                                                                                      |
| Tool calling nativo y few-shot (bonus) | Las 6 tools usan el tool calling nativo de OpenAI a través del AI SDK. El system prompt tiene 7 ejemplos de cómo actuar ([cómo está armado el prompt](#cómo-está-armado-el-prompt)).                                                                                                                                                                                        |
| API externa con manejo de errores      | dolarapi.com: timeout de 5 s, un reintento ante error del servidor (5xx), timeout o límite de pedidos (429, respetando `Retry-After`), caché de 5 minutos y validación con Zod de la respuesta.                                                                                                                                                                             |
| Mínimo 2 tools                         | 6: dos que consumen la API externa, tres de persistencia y una de cálculo.                                                                                                                                                                                                                                                                                                  |
| Persistencia                           | Conversaciones, mensajes, movimientos y el uso del asistente, en Supabase.                                                                                                                                                                                                                                                                                                  |
| Anti-«wrapper de ChatGPT»              | El modelo elige las tools según el contexto; sus datos se validan con esquemas; cita la fuente de las cotizaciones; usa el historial; y la lógica de negocio (validar movimientos, convertir, calcular estadísticas, límites de uso) es código propio que corre antes y después del modelo. Además el modelo nunca ve un historial inventado (ver [seguridad](#seguridad)). |
| Deploy en Vercel y `.env.example`      | Link al principio; todas las variables documentadas en [`.env.example`](.env.example).                                                                                                                                                                                                                                                                                      |

## Features bonus

| Feature            | Cómo                                                                                                                                                                                                                                                                                                                | Por qué                                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Streaming**      | La respuesta llega palabra por palabra (`streamText` en el servidor, `useChat` en el navegador) y las tarjetas de las tools aparecen apenas se ejecutan.                                                                                                                                                            | Una respuesta con tools puede tardar varios segundos. Ver que ya está escribiendo (y qué está haciendo) se siente mucho más rápido que esperar en blanco, y muestra que el pedido no se perdió. |
| **Testing**        | 544 tests con Vitest (unitarios y de integración, con la base local en Docker) y 18 de punta a punta con Playwright, en compu y celular. Ver [Tests](#tests).                                                                                                                                                       | Con un LLM en el medio es fácil romper algo sin darse cuenta. Los tests prueban sobre todo lo que puede fallar: datos inválidos, errores de las APIs, permisos entre personas.                  |
| **Rate limiting**  | Por persona: 10 mensajes por minuto y 150 por día. Los cuenta una función de Postgres (`consumir_cuota`) en un solo paso y con un candado por persona.                                                                                                                                                              | Cada mensaje gasta crédito de OpenAI. Sin límite, una persona (o un script con su sesión) podría agotarlo. Contarlo en la base hace que no se pueda esquivar con pedidos en paralelo.           |
| **Observabilidad** | Log estructurado en JSON (una línea por evento: cada respuesta del modelo con sus tokens, tools y demora, y cada error), sin datos de la persona. Además, el panel de debug.                                                                                                                                        | En producción no se puede «poner un console.log y mirar». Con un log en JSON se puede filtrar en Vercel por evento y entender qué pasó, sin exponer montos ni descripciones.                    |
| **Accesibilidad**  | Tamaño de letra ajustable con una barra (85 % a 130 %, también con el teclado), que se recuerda. Etiquetas ARIA, todo usable con teclado y con foco visible, cajones que no dejan escapar el foco, anuncios para lectores de pantalla, contraste WCAG AA en tema claro y oscuro. Revisado con axe en los tests E2E. | Una app de finanzas tiene que poder usarla cualquiera, incluso con lector de pantalla o solo con teclado. El chequeo automático evita que una mejora visual rompa la accesibilidad.             |

## Arquitectura

El proyecto está organizado en **capas**: cada carpeta tiene una responsabilidad y solo puede usar las capas de abajo.
Esas reglas no son solo una convención: las hace cumplir ESLint, así que si alguien las rompe, `npm run lint` y el build
de Vercel fallan con el motivo. El detalle completo está en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md); el vocabulario
del dominio (qué es un movimiento, una categoría, un período), en [CONTEXT.md](CONTEXT.md).

![Las capas de la app y cómo se conectan](docs/diagramas/capas.svg)

Cada capa tiene un trabajo. Siguiendo el ejemplo de alguien que escribe «Gasté 85.000 en el súper con débito»:

| Capa            | Carpeta                            | Qué hace, en simple                                                                                                                                                        | En el ejemplo                                                                       |
| --------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Frontend        | `src/frontend/`                    | Lo que se ve: la pantalla del chat, las tarjetas, los paneles.                                                                                                             | El campo donde escribís y el botón de enviar.                                       |
| Rutas           | `src/app/`                         | La puerta de entrada al servidor: recibe el pedido, se fija que haya una sesión iniciada y se lo pasa a un controller.                                                     | Recibe el mensaje en `/api/chat`.                                                   |
| Controllers     | `src/backend/controllers/`         | Revisan que el pedido esté bien armado y deciden qué hay que hacer con él. Hay uno por tipo de pedido.                                                                     | `ChatController` revisa el mensaje, descuenta la cuota y llama al asistente.        |
| Asistente       | `src/backend/asistente/`           | Habla con OpenAI: le manda las instrucciones, la conversación y la lista de herramientas. Solo el agente y el titulador usan el modelo.                                    | Le pregunta al modelo qué hacer, y el modelo decide registrar un gasto.             |
| Tools           | `src/backend/tools/`               | Las herramientas que el modelo puede usar. Cada una revisa los datos que armó el modelo y le pasa el pedido a un servicio.                                                 | `registrar_movimiento` recibe `{ gasto, 85000, supermercado, debito }`.             |
| Servicios       | `src/backend/servicios/`           | Hacen el trabajo de verdad (registrar, calcular estadísticas, buscar el dólar). Los usan varias partes de la app.                                                          | `MovimientosServicio` registra el gasto. El panel «Este mes» usa el mismo servicio. |
| Dominio         | `src/backend/models/dominio/`      | Las reglas del negocio, sin base de datos ni internet: qué es un gasto válido, cómo se suma la plata, qué es «este mes».                                                   | Controla que el monto sea positivo y que «supermercado» sea una categoría de gasto. |
| Repositorios    | `src/backend/models/repositorios/` | Los únicos que leen y escriben en la base de datos (Supabase).                                                                                                             | Guarda el gasto en la tabla de movimientos.                                         |
| Infraestructura | `src/backend/lib/`                 | Los clientes de los servicios de afuera: OpenAI, dolarapi.com, y también el log y las claves. El modelo de OpenAI se crea solo acá (`lib/openai.ts`), una vez, y se reusa. | Si el gasto fuera en dólares, acá se pide la cotización a dolarapi.com.             |
| Compartido      | `src/shared/`                      | Lo que usan tanto el servidor como el navegador: el formato de los mensajes, los códigos de error y las URLs.                                                              | El formato del mensaje que viaja del navegador al servidor.                         |

Dos reglas que ordenan todo (y que ESLint hace cumplir):

- **Cada capa solo usa las de abajo.** Por ejemplo, el frontend nunca habla directo con la base de datos.
- **Un controller no llama a otro controller.** Lo que necesitan varios va a un servicio. Así el chat y el panel «Este
  mes» usan el mismo `MovimientosServicio` y nunca pueden mostrar números distintos.

### Rutas

- `/`: la pantalla de inicio (con «Ingresar con Google» si no hay sesión).
- `/conversacion/<id>`: una conversación.
- `POST /api/chat`: un mensaje al asistente.
- `GET /auth/callback`: la vuelta del login de Google.

## El recorrido de un mensaje

Qué pasa, en orden, cuando la persona escribe «Pagué 15 dólares de Spotify con la tarjeta» y aprieta Enter:

1. **En el navegador.** El campo valida que el mensaje no esté vacío ni pase los 6000 caracteres. `useChat` (del AI SDK)
   manda a `POST /api/chat` solo el mensaje nuevo y el id de la conversación; el historial no viaja, lo lee el servidor.
2. **La ruta** ([`src/app/api/chat/route.ts`](src/app/api/chat/route.ts)) verifica que haya sesión (si no, responde 401
   «Tu sesión expiró») y le pasa el pedido a `ChatController`.
3. **`ChatController` prepara todo antes de llamar al modelo**, y corta apenas algo falla, sin guardar nada:
   1. valida el cuerpo del pedido con Zod (formato del mensaje, largo, id de la conversación);
   2. le pide al agente que verifique que el modelo de OpenAI esté listo (si falta la clave, corta con un error claro);
   3. descuenta un mensaje de la cuota de la persona (si llegó al límite, corta con «esperá un minuto» o «mañana podés
      seguir»);
   4. si la conversación es nueva, la crea; si el id es de una conversación ajena, corta con «no encontrada»;
   5. lee de la base los últimos 20 mensajes, descartando las respuestas «del asistente» sin firma válida y los mensajes
      con un formato roto;
   6. guarda el mensaje de la persona.
4. **El agente llama al modelo** ([`agente.ts`](src/backend/asistente/agente.ts)) con el system prompt, el historial
   (la última respuesta completa; las anteriores con los resultados de sus tools resumidos, para ahorrar tokens) y la
   lista de tools.
5. **El modelo decide qué hacer.** Acá entiende que es un gasto en dólares con tarjeta y pide ejecutar
   `registrar_movimiento` con `{ tipo: "gasto", monto: 15, moneda: "USD", categoria: "suscripciones",
medioDePago: "credito", tipoDeDolar: "tarjeta", … }`.
6. **La tool** valida ese JSON con su esquema y se lo pasa a `MovimientosServicio.registrar`, que:
   1. valida el movimiento con las reglas del dominio (ver [validaciones](#validaciones-antes-de-guardar));
   2. como es en dólares, pide a dolarapi.com el dólar tarjeta del día (con timeout, reintento y caché);
   3. lo guarda en la base con su monto en pesos y la cotización usada.

   Si algo falla (un dato inválido, dolarapi caído), no se guarda nada y la tool le devuelve al modelo
   `{ ok: false, motivo, detalle }`.

7. **El modelo recibe el resultado** y escribe la respuesta («Registrado: US$ 15… Fuente: dolarapi.com»). Si necesita
   otra tool, vuelve al paso 5 (hasta 8 pasos).
8. **La persona ve la respuesta mientras se arma,** sin esperar a que termine todo (esto es el _streaming_): apenas la
   tool guarda el gasto aparece la tarjeta «Gasto registrado», y después el texto del asistente va apareciendo de a poco,
   palabra por palabra, como si lo estuviera escribiendo.
9. **Al terminar,** el servidor firma la respuesta y la guarda. En el navegador:
   1. se actualiza la lista de conversaciones;
   2. se pide en segundo plano un título según lo que se habló;
   3. como cambió un movimiento, se vuelve a leer el panel «Este mes» (sin recargar la página).

![El recorrido de un mensaje, de la persona a la base y de vuelta](docs/diagramas/recorrido-de-un-mensaje.svg)

## Decisiones técnicas y trade-offs

### Por qué estas tools y esta API

- **dolarapi.com** porque en Argentina registrar un gasto en dólares sin saber a qué dólar es un dato a medias: entre el
  oficial, el blue y el tarjeta puede haber mucha diferencia. Es gratuita, no necesita clave y tiene todas las
  cotizaciones que importan. El monto en pesos se guarda con la cotización **del día del registro**, para que el
  historial no cambie cuando cambia el dólar
  ([docs/adr/0001](docs/adr/0001-monto-en-pesos-con-la-cotizacion-del-registro.md)).
- **Tools chicas y de un solo propósito** (registrar, consultar, estadísticas, borrar, cotización, convertir): con
  descripciones claras el modelo elige mejor, y cada una se valida y se prueba por separado. Las cuentas (totales,
  porcentajes, promedios, conversiones) las hace código propio, nunca el modelo.
- **Vercel AI SDK** en vez de llamar a la API de OpenAI a mano o usar LangChain: trae tool calling con esquemas de Zod,
  streaming de punta a punta (servidor y `useChat` en React) y tipos derivados de las tools reales (si una tool cambia,
  la pantalla deja de compilar hasta adaptarla). LangChain sumaba una capa de abstracción que este caso no necesita.
- **El modelo de OpenAI se crea en un solo lugar** ([`lib/openai.ts`](src/backend/lib/openai.ts)): la primera vez que
  se pide, y después se reusa. Lo usan solo el agente (las respuestas) y el titulador (los títulos); los controllers y
  servicios no saben de OpenAI. Así, cambiar de proveedor o de modelo se hace en un solo archivo, y en los tests se les
  pasa un modelo falso.
- **Supabase** porque trae Postgres, el login con Google y RLS (_Row Level Security_: reglas en la base que hacen que
  cada persona solo pueda leer y escribir sus propias filas). Así la seguridad de los datos no depende de que el código
  se acuerde de filtrar por usuario en cada consulta.

### Validaciones antes de guardar

Un movimiento pasa por **tres controles** antes de quedar guardado. Son redundantes a propósito: cada uno protege de
algo distinto.

1. **El esquema de la tool** ([`validacionTools.ts`](src/backend/tools/validacionTools.ts)) controla la _forma_ de lo
   que arma el modelo: que estén los campos, que el monto sea un número positivo, que la moneda sea `ARS` o `USD`, que
   la categoría y el medio de pago sean de la lista, que la fecha sea `AAAA-MM-DD`. Si el modelo arma un JSON roto, la
   tool ni se ejecuta. Además, las descripciones de cada campo son las instrucciones que lee el modelo («el medio de pago
   nunca lo asumas»).
2. **Las reglas del dominio** ([`validacionDominio.ts`](src/backend/models/dominio/validacionDominio.ts)) controlan que
   el movimiento _tenga sentido_, antes de buscar la cotización y de guardar:
   - el monto es mayor que cero, tiene a lo sumo dos decimales y entra en la base (hasta 999.999.999.999,99);
   - la categoría corresponde al tipo: «supermercado» es de gastos y «sueldo» de ingresos, así que un ingreso de
     supermercado se rechaza;
   - la descripción no está vacía y tiene hasta 200 caracteres;
   - la fecha existe en el calendario y está entre 1900 y 2100.

   Si algo no cumple, el servicio devuelve `{ ok: false, motivo: "datos_invalidos", detalle: "La categoría no
corresponde al tipo de movimiento." }` y el modelo corrige el dato o se lo explica a la persona. Estas reglas están en
   el dominio (y no solo en la tool) porque son del negocio, no del modelo: valen igual sin importar quién pida guardar.

3. **Los `check` de la base** (en la [migración](src/backend/supabase/migrations/20260929000000_esquema_inicial.sql))
   repiten las reglas importantes: monto positivo, moneda y medio de pago válidos, categoría según el tipo, y que un
   movimiento en dólares tenga su cotización. Es la última red: aunque un bug saltee las capas anteriores, la base no
   acepta un dato imposible.

### Errores y casos borde

- **Las tools no lanzan errores:** si algo falla devuelven `{ ok: false, motivo, detalle }`, el modelo se lo explica a la
  persona en una línea y, si fue un dato inválido, lo corrige y reintenta una vez. Si falla algo inesperado (la base, un
  bug), queda en el log y la tool devuelve `error_interno`: la conversación no se rompe.
- **dolarapi.com** puede fallar de cuatro maneras y cada una tiene su motivo: `tiempo` (no respondió en 5 s), `limite`
  (429, demasiados pedidos), `servicio` (error del servidor o de la red) y `respuesta_invalida` (respondió algo que no
  pasa la validación). Ante timeout, 5xx o 429 se reintenta una vez (con un 429, esperando lo que pide `Retry-After` si
  es razonable). Nunca se registra un gasto en dólares con una cotización inventada.
- **OpenAI:** se distingue «sin saldo o mal configurado» (`asistente_no_disponible`), «saturado» (429 por rate limit,
  con «Reintentar») y «demorado» (más de 45 s). Cada uno se muestra con un mensaje para la persona, sin detalles técnicos.
- **Errores con código estable:** cada error tiene un código (`limite_por_minuto`, `pedido_invalido`,
  `conversacion_no_encontrada`…) definido en [`erroresShared.ts`](src/shared/erroresShared.ts), y un único archivo los
  traduce a HTTP ([`respuestaDeError.ts`](src/app/api/respuestaDeError.ts)).
- **Plata:** las cuentas se hacen en centavos enteros (los decimales de JavaScript dan cosas como 0,1 + 0,2 =
  0,30000000000000004) y la base usa `numeric(14,2)`.
- **Fechas:** en hora de Argentina. «Hasta el viernes» sin «desde» no se adivina: se pregunta, ofreciendo «desde hoy».
  Una fecha futura solo si la plata se mueve ese día (un cheque diferido, un débito programado).
- **Doble envío o reintento:** si el mismo mensaje llega dos veces (por ejemplo, al apretar «Reintentar»), no se guarda
  dos veces (cada mensaje tiene un id único), y el modelo lo ve en su lugar con lo que ya había respondido, así no lo toma
  como un pedido nuevo ni vuelve a registrar el gasto.

#### Seguridad

- **RLS en todas las tablas** y la clave de administrador de Supabase (`service_role`) nunca se usa en la app: cada
  consulta va con la sesión de la persona.
- **Respuestas firmadas:** el servidor firma cada respuesta del asistente con una clave secreta (HMAC). Al armar el
  historial que ve el modelo, descarta las que no tienen firma válida. Así nadie puede meter en la base una respuesta
  «del asistente» inventada para manipular al modelo.
- **Cuota de uso en la base,** en un solo paso y con candado: no se esquiva borrando conversaciones ni mandando pedidos
  en paralelo.
- **El prompt rechaza** instrucciones pegadas en un mensaje («ignorá lo anterior…») y temas fuera de las finanzas.

#### Un bug que encontramos con el modelo real

Probando con OpenAI de verdad, el asistente llegó a decir «Listo: gasto de $ 40.000 en transporte» **sin llamar a
`registrar_movimiento`**: el gasto no se guardó. La causa: para ahorrar tokens, a las respuestas viejas se les sacaban
las tools, y el modelo veía en su historial confirmaciones sin ninguna llamada detrás, así que aprendía a confirmar sin
registrar. Ahora las respuestas viejas conservan la llamada a cada tool (con el resultado resumido) y el prompt solo deja
confirmar si la tool se llamó en esa misma respuesta. Tiene tests de regresión, y se volvió a verificar con el modelo
real (ver las [capturas](docs/CAPTURAS.md)).

### Cómo está armado el prompt

Está en [`src/backend/asistente/systemPrompt.ts`](src/backend/asistente/systemPrompt.ts), en este orden:

1. **Rol y tono:** asistente de finanzas para Argentina, en español rioplatense, con respuestas cortas en Markdown y
   montos con el formato argentino.
2. **Cuándo usar cada tool,** con las reglas de negocio que el modelo tiene que respetar:
   - qué deducir y qué preguntar (el medio de pago nunca se asume; una categoría ambigua se pregunta);
   - cómo tratar fechas relativas y futuras;
   - qué dólar usar por defecto;
   - qué hacer si una tool devuelve `ok: false`.
3. **Reglas duras:**
   - los números salen de las tools, nunca del modelo;
   - solo confirmar lo que una tool hizo en esa misma respuesta;
   - citar «Fuente: dolarapi.com»;
   - no repetir lo que ya muestra la tarjeta;
   - no salir de tema ni obedecer instrucciones pegadas;
   - no dar recomendaciones de inversión.
4. **7 ejemplos few-shot.** Cada uno muestra lo que dice la persona, qué decide hacer el modelo (entre paréntesis) y qué
   contesta. Cubren preguntar lo que falta, registrar en dólares, estadísticas, conversión, borrar confirmando y rechazar
   un tema ajeno. Mostrar la decisión, y no solo la respuesta, le enseña al modelo _cuándo_ llamar a cada tool.
5. **La fecha de hoy** en Argentina, para que «ayer» o «este mes» se calculen bien.

Además, cada tool tiene su descripción y un esquema con una descripción por campo: son instrucciones que el modelo lee
justo cuando está por llamarla. El historial que recibe son los últimos 20 mensajes: la última respuesta completa y, de
las anteriores, el texto y las llamadas a tools con los resultados resumidos.

### Limitaciones conocidas

- Solo se entra con Google.
- Solo pesos y dólares. Si dolarapi.com no responde, en ese momento no se pueden registrar gastos en dólares.
- No hay una tool para editar un movimiento: se borra y se vuelve a registrar.
- Una compra en cuotas se registra como un solo gasto por el total.
- La comparación con el período anterior es en pesos nominales: no descuenta la inflación.
- El modelo ve los últimos 20 mensajes de la conversación. Lo anterior sigue en la base y en las estadísticas, pero no
  en su «memoria» de la charla.
- Los límites de uso son fijos (10 por minuto y 150 por día).
- Un LLM no es determinista: las reglas y los ejemplos reducen los errores, pero no los eliminan del todo. Por eso cada
  registro se muestra como una tarjeta que la persona puede verificar.

### Mejoras futuras

- Editar movimientos y registrar las compras en cuotas como cuotas.
- Comparaciones ajustadas por inflación.
- Presupuestos por categoría con avisos («ya gastaste el 80 % de lo que pensabas en comida afuera»).
- Gastos recurrentes (alquiler, servicios) y gráficos de la evolución mes a mes.
- Feedback 👍/👎 en cada respuesta para medir la calidad del asistente.
- Exportar a CSV e importar el resumen de la tarjeta.
- Otras formas de cargar: una foto del ticket o un audio.

## Uso de IA

El proyecto se desarrolló con **Claude Code** (Anthropic) como asistente de programación, siguiendo reglas escritas para
que el resultado fuera revisable y no código generado sin control:

- [`CLAUDE.md`](CLAUDE.md) y [`REGLAS-SKILLS.md`](REGLAS-SKILLS.md) fijan las reglas del proyecto:
  - las validaciones con Zod y los errores van en archivos propios de cada carpeta;
  - cómo se diseñan los tests (partición de equivalencia, valores borde, regresión);
  - la base de datos nunca se mockea (se prueba contra Supabase local) y el LLM y las APIs externas siempre se mockean;
  - antes de cerrar cada tarea se corre la verificación completa (tipos, lint, tests, E2E y build).
- Cada cambio se revisó y se verificó con los tests, y lo que depende del modelo se probó además con OpenAI real en local.
  Así aparecieron, por ejemplo, el bug de las confirmaciones sin registrar y una regresión en el login, cada uno con su
  test de regresión.
- Las decisiones de diseño (arquitectura en capas, servicios compartidos, validación en tres capas, firma del historial)
  están explicadas en este README y en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
- Las skills que usa el asistente de programación se instalan en cada máquina y no forman parte del repositorio.

## Instalación local

Requisitos:

- Node.js 20 o más nuevo;
- una cuenta de Supabase (gratis) y una API key de OpenAI;
- para los tests de integración y E2E, Docker Desktop.

```bash
npm install
cp .env.example .env.local   # en Windows (cmd): copy .env.example .env.local
npm run dev
```

La app queda en http://localhost:3000. [`.env.example`](.env.example) explica cada variable. Las obligatorias son:

- `OPENAI_API_KEY`;
- `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`;
- `FIRMA_DE_MENSAJES`: cualquier texto aleatorio de 32 caracteres o más.

### Configuración de Supabase

1. Crear el proyecto y aplicar las migraciones de `src/backend/supabase/migrations/` (esquema inicial, cuota de uso y
   firma de mensajes):

   ```bash
   npx supabase link --project-ref <id-del-proyecto> --workdir src/backend
   npx supabase db push --workdir src/backend
   ```

   O pegarlas en orden en el SQL Editor de Supabase.

2. Copiar la Project URL y la publishable key a `.env.local`.
3. En Authentication → URL Configuration, poner:
   - Site URL: `http://localhost:3000`;
   - Redirect URL: `http://localhost:3000/auth/callback`;
   - para producción, las mismas con la URL de Vercel.
4. **Google OAuth:**
   1. Crear un OAuth client (Web application) en Google Cloud con redirect URI
      `https://<id-del-proyecto>.supabase.co/auth/v1/callback`.
   2. Cargar el Client ID y el Client secret en Supabase → Authentication → Sign In / Providers → Google.

### La base de datos local (Docker)

Los tests de integración y los E2E no usan tu proyecto de Supabase: usan una **copia local**, que el Supabase CLI levanta
en Docker con las mismas migraciones y políticas RLS. Así se puede probar todo sin tocar datos reales, y cada test
arranca con la base limpia.

1. Instalar [Docker Desktop](https://www.docker.com/products/docker-desktop/) y abrirlo (tiene que quedar corriendo).
2. Levantar la base. La primera vez descarga las imágenes de Supabase y tarda unos minutos; después, segundos:

   ```bash
   npm run db:start
   ```

   Al terminar muestra las direcciones y las claves de la copia local. Se ve parecido a esto (los valores de este
   ejemplo son inventados; en tu máquina van a ser otros):

   ```text
   Started supabase local development setup.

            API URL: http://127.0.0.1:54321
             DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
         Studio URL: http://127.0.0.1:54323
    Publishable key: sb_publishable_EJEMPLO_inventado_123
         Secret key: sb_secret_EJEMPLO_inventado_456
   ```

   No hace falta copiar nada: los tests leen esas claves solos con `supabase status`. **Studio**
   (http://127.0.0.1:54323 en el ejemplo) es el panel de Supabase de la copia local: sirve para mirar las tablas y los
   datos que dejan los tests.

3. Correr los tests (ver [Tests](#tests)).
4. Al terminar, apagarla con `npm run db:stop`.

Si `npm run db:start` falla con un error de conexión, casi siempre es que Docker Desktop no está abierto. Si los tests
fallan con `fetch failed` después de suspender la máquina, reiniciar la base (`npm run db:stop` y `npm run db:start`)
lo resuelve.

La copia local no tiene configurado el login con Google: es para los tests. Para usar la app con `npm run dev` se usa
tu proyecto de Supabase (ver arriba).

## Scripts de npm

Para correr la app:

| Script          | Qué hace                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `npm install`   | Instala las dependencias. Una sola vez, al bajar el proyecto.                                       |
| `npm run dev`   | Levanta la app en http://localhost:3000. Se recarga sola al guardar un archivo.                     |
| `npm run build` | Compila la app para producción (es lo que corre Vercel). Si hay un error de tipos o de lint, falla. |
| `npm start`     | Sirve la app ya compilada con `build`, como en producción.                                          |

Para los tests:

| Script                     | Qué hace                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm run db:start`         | Levanta la base de datos local en Docker (ver [arriba](#la-base-de-datos-local-docker)). Hace falta para `npm test` y los E2E. |
| `npm test`                 | Corre todos los tests de Vitest: los unitarios y los de integración.                                                           |
| `npm run test:unitarios`   | Solo los tests unitarios (no necesitan Docker ni internet). Tardan segundos.                                                   |
| `npm run test:integracion` | Solo los de integración: contra la base local y contra un servidor falso de dolarapi.                                          |
| `npm run test:e2e`         | Los tests de punta a punta con Playwright, en un navegador real (compu y celular).                                             |
| `npm run db:stop`          | Apaga la base local al terminar.                                                                                               |

## Tests

Ningún test llama a OpenAI ni a dolarapi.com de verdad: se usan un modelo falso del AI SDK y servidores falsos, que además
permiten provocar a demanda los errores (un 429, un timeout, una respuesta rota). Tampoco usan una base remota: lo que
guarda datos se prueba contra la copia local de Supabase en Docker, con las mismas migraciones y políticas RLS que
producción. Son deterministas: no dependen de internet, del reloj ni del orden en que corren.

| Suite                  | Dónde                                                 | Qué prueba                                                                                        |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Unitarios              | `src/backend/tests/unitarios/`, `src/frontend/tests/` | Dominio, servicios, tools, asistente y componentes de React. Sin Docker ni internet.              |
| Integración Supabase   | `src/backend/tests/integracion/supabase/`             | Repositorios, RLS (que nadie vea lo de otro), auth, cuota, firma y tools contra la base.          |
| Integración HTTP local | `src/backend/tests/integracion/http-local/`           | El cliente del dólar contra un servidor HTTP local (errores, timeouts, 429).                      |
| De punta a punta (E2E) | `e2e/`                                                | Los flujos críticos en un navegador real, en compu y celular, con chequeo de accesibilidad (axe). |

```bash
npm run db:start   # una vez por sesión (Docker Desktop abierto)
npm test           # unitarios + las dos integraciones
npm run test:e2e   # Playwright
npm run db:stop
```

## Deploy

Vercel despliega cada push a `main`. En Vercel van las mismas variables de `.env.example`; `OPENAI_API_KEY` y
`FIRMA_DE_MENSAJES` como secretas. Las migraciones nuevas se aplican en la Supabase de producción antes de desplegar el
código que las usa.

## Link a la app

https://administrador-de-finanzas-mspadoni.vercel.app

Video demo: https://youtu.be/8iwNAZyjZMU

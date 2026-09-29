-- Esquema completo del asistente de finanzas: conversaciones del chat, sus mensajes y los movimientos (gastos e
-- ingresos) de cada persona. Es la única migración: en un proyecto nuevo de Supabase se aplica de una vez.
-- Local: `npm run db:reset`. Nube: `npx supabase db push --workdir backend` (o pegarla en el SQL Editor).
-- El vocabulario (movimiento, categoría, medio de pago, monto en pesos…) está en CONTEXT.md; por qué se guarda el
-- monto en pesos con la cotización del día, en docs/adr/0001.

-- ---------------------------------------------------------------------------------------------------------------
-- Conversaciones: una por charla de la persona con el asistente.
-- El id lo genera el navegador al empezar una conversación nueva (así la URL existe desde el primer mensaje).
create table conversaciones (
  id uuid primary key,
  -- default auth.uid(): al insertar, se completa solo con la persona logueada.
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 120),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index idx_conversaciones_usuario on conversaciones (usuario_id, actualizado_en desc);

-- ---------------------------------------------------------------------------------------------------------------
-- Mensajes de cada conversación. `partes` guarda el mensaje tal como lo arma el Vercel AI SDK (texto y las tools
-- que usó el modelo), así al reabrir la conversación se ve igual que cuando se generó.
create table mensajes (
  id text not null,                  -- id del mensaje que genera el AI SDK
  conversacion_id uuid not null references conversaciones (id) on delete cascade,
  rol text not null check (rol in ('usuario', 'asistente')),
  partes jsonb not null check (jsonb_typeof(partes) = 'array'),
  creado_en timestamptz not null default now(),
  primary key (conversacion_id, id)
);

create index idx_mensajes_conversacion on mensajes (conversacion_id, creado_en);

-- ---------------------------------------------------------------------------------------------------------------
-- Movimientos (gastos e ingresos) de cada persona: lo que registra el asistente.
create table movimientos (
  -- uuid como las demás tablas del proyecto: los ids no se pueden adivinar (el asistente los usa para borrar).
  id uuid primary key default gen_random_uuid(),
  -- default auth.uid(): al insertar, se completa solo con la persona logueada.
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('gasto', 'ingreso')),
  -- numeric y no float: con plata la aritmética tiene que ser exacta.
  monto numeric(14, 2) not null check (monto > 0),
  moneda text not null check (moneda in ('ARS', 'USD')),
  -- Monto en pesos: igual al monto si es en pesos; con la cotización del día en que se registró si es en dólares.
  monto_en_pesos numeric(16, 2) not null check (monto_en_pesos > 0),
  tipo_de_dolar text check (tipo_de_dolar in ('oficial', 'blue', 'mep', 'tarjeta')),
  cotizacion numeric(12, 4) check (cotizacion > 0),
  categoria text not null,
  medio_de_pago text not null
    check (medio_de_pago in ('efectivo', 'debito', 'credito', 'transferencia', 'billetera_virtual')),
  descripcion text not null check (char_length(descripcion) between 1 and 200),
  -- El día del movimiento según la persona (hora de Argentina), no el momento en que se cargó.
  fecha date not null,
  creado_en timestamptz not null default now(),

  -- Cada tipo de movimiento tiene su lista fija de categorías.
  constraint categoria_segun_tipo check (
    (tipo = 'gasto' and categoria in (
      'supermercado', 'comida_afuera', 'transporte', 'servicios', 'vivienda', 'salud',
      'educacion', 'ocio', 'ropa', 'suscripciones', 'otros'
    ))
    or (tipo = 'ingreso' and categoria in ('sueldo', 'trabajo_independiente', 'ventas', 'regalos', 'otros'))
  ),
  -- En pesos no hay cotización y el monto en pesos es el monto; en dólares, tipo de dólar y cotización son obligatorios.
  constraint cotizacion_segun_moneda check (
    (moneda = 'ARS' and tipo_de_dolar is null and cotizacion is null and monto_en_pesos = monto)
    or (moneda = 'USD' and tipo_de_dolar is not null and cotizacion is not null)
  )
);

-- Las consultas son siempre "los movimientos de esta persona en este período": igualdad primero, rango después.
create index idx_movimientos_usuario_fecha on movimientos (usuario_id, fecha desc);

-- ---------------------------------------------------------------------------------------------------------------
-- Acceso: las tablas no quedan expuestas solas en la Data API (cambio de Supabase de 2026); se habilitan solo para
-- personas logueadas, nunca para anon.
revoke all on table conversaciones, mensajes, movimientos from anon;
grant select, insert, update, delete on table conversaciones to authenticated;
grant select, insert on table mensajes to authenticated;
grant select, insert, update, delete on table movimientos to authenticated;

-- RLS: cada persona solo ve y toca lo suyo. Lo controla Postgres, así que vale aunque el código tenga un bug.
-- (select auth.uid()) se evalúa una vez por consulta, no por fila.
alter table conversaciones enable row level security;
alter table mensajes enable row level security;
alter table movimientos enable row level security;

create policy "Cada persona ve sus conversaciones"
  on conversaciones for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "Cada persona crea sus conversaciones"
  on conversaciones for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "Cada persona actualiza sus conversaciones"
  on conversaciones for update to authenticated
  using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
create policy "Cada persona borra sus conversaciones"
  on conversaciones for delete to authenticated using ((select auth.uid()) = usuario_id);

-- Los mensajes no tienen usuario_id: se controlan a través de su conversación.
create policy "Cada persona ve los mensajes de sus conversaciones"
  on mensajes for select to authenticated
  using (exists (select 1 from conversaciones c where c.id = conversacion_id and c.usuario_id = (select auth.uid())));
create policy "Cada persona agrega mensajes a sus conversaciones"
  on mensajes for insert to authenticated
  with check (exists (select 1 from conversaciones c where c.id = conversacion_id and c.usuario_id = (select auth.uid())));

create policy "Cada persona ve sus movimientos"
  on movimientos for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "Cada persona registra sus movimientos"
  on movimientos for insert to authenticated with check ((select auth.uid()) = usuario_id);
-- UPDATE con USING y WITH CHECK: sin WITH CHECK alguien podría pasarle un movimiento suyo a otra persona.
create policy "Cada persona corrige sus movimientos"
  on movimientos for update to authenticated
  using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
create policy "Cada persona borra sus movimientos"
  on movimientos for delete to authenticated using ((select auth.uid()) = usuario_id);

-- Cuota de uso del asistente: cuántas veces por minuto y por día una persona puede pedirle algo que gasta crédito de
-- OpenAI (un mensaje del chat o el título de una conversación).
--
-- Antes se contaban las filas de `mensajes`, que se borran en cascada con la conversación: borrando conversaciones el
-- contador volvía a cero. Además se contaba y después se guardaba, en dos pasos: varios pedidos a la vez pasaban todos.
-- Ahora el uso se anota en una tabla propia, que la persona no puede tocar, y una función cuenta y anota en un solo paso.

create table uso_del_asistente (
  id bigint generated always as identity primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Qué se pidió: un mensaje del chat o el título de una conversación. Cada uno tiene su propia cuota.
  tipo text not null check (tipo in ('mensaje', 'titulo')),
  creado_en timestamptz not null default now()
);

-- La cuenta es siempre "lo de esta persona, de este tipo, en el último día": igualdad primero, rango después.
create index idx_uso_del_asistente on uso_del_asistente (usuario_id, tipo, creado_en desc);

-- Nadie la lee ni la escribe directo (ni siquiera la persona logueada): solo a través de consumir_cuota.
revoke all on table uso_del_asistente from anon, authenticated;
alter table uso_del_asistente enable row level security;

-- Cuenta el uso de la persona logueada en el último minuto y en el último día y, si todavía tiene cuota, anota este uso.
-- Devuelve null si se puede seguir, o 'limite_por_dia' / 'limite_por_minuto' (el del día pesa más: esperar un minuto
-- no alcanza). El candado por persona (advisory lock) hace que dos pedidos a la vez se cuenten uno después del otro.
-- security definer: corre con permisos del dueño para poder leer y escribir la tabla, pero siempre para auth.uid(), así
-- que la persona solo puede gastar su propia cuota.
create function consumir_cuota(p_tipo text, p_por_minuto integer, p_por_dia integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_ultimo_minuto integer;
  v_ultimo_dia integer;
begin
  if v_usuario is null then
    raise exception 'consumir_cuota necesita una sesión' using errcode = '42501';
  end if;
  if p_tipo not in ('mensaje', 'titulo') then
    raise exception 'tipo de uso desconocido: %', p_tipo using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_usuario::text || ':' || p_tipo, 0));

  select
    count(*) filter (where creado_en > now() - interval '1 minute'),
    count(*)
  into v_ultimo_minuto, v_ultimo_dia
  from public.uso_del_asistente
  where usuario_id = v_usuario and tipo = p_tipo and creado_en > now() - interval '1 day';

  if v_ultimo_dia >= p_por_dia then
    return 'limite_por_dia';
  end if;
  if v_ultimo_minuto >= p_por_minuto then
    return 'limite_por_minuto';
  end if;

  insert into public.uso_del_asistente (usuario_id, tipo) values (v_usuario, p_tipo);
  return null;
end;
$$;

revoke execute on function consumir_cuota(text, integer, integer) from public, anon;
grant execute on function consumir_cuota(text, integer, integer) to authenticated;

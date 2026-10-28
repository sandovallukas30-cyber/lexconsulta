-- Prima Lex: ESTADÍSTICAS DE USO anónimas (OPCIONAL: solo si activas el panel de uso; ver docs/ANALITICA_USO.md).
-- Pégalo completo en Supabase → SQL Editor → New query → Run. Se puede volver a ejecutar sin romper nada.
--
-- Qué guarda: contadores por día («esta función se usó N veces», «hubo N segundos de uso en esta pantalla»).
-- Qué NO guarda: textos, nombres, correos, ni ningún identificador de persona o de dispositivo.

-- ---------------------------------------------------------------------------
-- Contadores diarios. Nadie puede leer ni escribir directo (sin políticas): solo las funciones de abajo.
-- ---------------------------------------------------------------------------
create table if not exists public.uso_diario (
  dia date not null,
  tipo text not null check (tipo in ('sesion', 'evento', 'vista')),
  clave text not null check (length(clave) <= 40),
  dispositivo text not null check (dispositivo in ('movil', 'tablet', 'escritorio')),
  cantidad bigint not null default 0,  -- visitas (tipo sesion) o veces que se usó la función (tipo evento)
  segundos bigint not null default 0,  -- tiempo de uso activo (tipo vista)
  primary key (dia, tipo, clave, dispositivo)
);
alter table public.uso_diario enable row level security;
revoke all on public.uso_diario from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Quién puede ver el panel: SOLO las cuentas que tú agregues a mano en esta tabla (ver docs/ANALITICA_USO.md).
-- Está cerrada: desde el navegador nadie puede agregarse a sí mismo.
-- ---------------------------------------------------------------------------
create table if not exists public.administradores (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.administradores enable row level security;
revoke all on public.administradores from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Escribir: SOLO el servidor (api/uso.ts, con la clave service_role). Valida y acota todo lo que llega.
-- ---------------------------------------------------------------------------
create or replace function public.registrar_uso(
  p_dispositivo text,
  p_nueva boolean,
  p_sesion boolean,
  p_eventos jsonb,
  p_segundos jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := (now() at time zone 'America/Santiago')::date;
  k text;
  v text;
  n bigint;
begin
  if p_dispositivo not in ('movil', 'tablet', 'escritorio') then
    raise exception 'dispositivo no válido';
  end if;

  if p_sesion then
    insert into public.uso_diario (dia, tipo, clave, dispositivo, cantidad)
    values (v_dia, 'sesion', case when p_nueva then 'nueva' else 'regreso' end, p_dispositivo, 1)
    on conflict (dia, tipo, clave, dispositivo) do update set cantidad = public.uso_diario.cantidad + 1;
  end if;

  if p_eventos is not null and jsonb_typeof(p_eventos) = 'object' then
    for k, v in select * from jsonb_each_text(p_eventos) limit 60 loop
      if length(k) <= 40 and v ~ '^[0-9]{1,6}$' then
        n := least(v::bigint, 500);
        if n >= 1 then
          insert into public.uso_diario (dia, tipo, clave, dispositivo, cantidad)
          values (v_dia, 'evento', k, p_dispositivo, n)
          on conflict (dia, tipo, clave, dispositivo) do update set cantidad = public.uso_diario.cantidad + n;
        end if;
      end if;
    end loop;
  end if;

  if p_segundos is not null and jsonb_typeof(p_segundos) = 'object' then
    for k, v in select * from jsonb_each_text(p_segundos) limit 20 loop
      if length(k) <= 40 and v ~ '^[0-9]{1,6}$' then
        n := least(v::bigint, 3600);
        if n >= 1 then
          insert into public.uso_diario (dia, tipo, clave, dispositivo, segundos)
          values (v_dia, 'vista', k, p_dispositivo, n)
          on conflict (dia, tipo, clave, dispositivo) do update set segundos = public.uso_diario.segundos + n;
        end if;
      end if;
    end loop;
  end if;
end;
$$;

revoke all on function public.registrar_uso(text, boolean, boolean, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_uso(text, boolean, boolean, jsonb, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Leer: SOLO administradores. La app llama a es_administrador() para saber si mostrar el panel, y a uso_resumen() para los datos.
-- ---------------------------------------------------------------------------
create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.administradores where user_id = auth.uid());
$$;

revoke all on function public.es_administrador() from public, anon;
grant execute on function public.es_administrador() to authenticated;

create or replace function public.uso_resumen(p_desde date, p_hasta date)
returns table (dia date, tipo text, clave text, dispositivo text, cantidad bigint, segundos bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_administrador() then
    raise exception 'No autorizado';
  end if;
  if p_hasta < p_desde or p_hasta - p_desde > 400 then
    raise exception 'Rango de fechas no válido';
  end if;
  return query
    select u.dia, u.tipo, u.clave, u.dispositivo, u.cantidad, u.segundos
    from public.uso_diario u
    where u.dia between p_desde and p_hasta
    order by u.dia;
end;
$$;

revoke all on function public.uso_resumen(date, date) from public, anon;
grant execute on function public.uso_resumen(date, date) to authenticated;

-- Prima Lex: cuentas y sincronización (Supabase).
-- Pégalo completo en Supabase → SQL Editor → New query → Run. Se puede volver a
-- ejecutar sin romper nada (usa IF NOT EXISTS / OR REPLACE).

-- ---------------------------------------------------------------------------
-- Perfil: el plan (gratis | pro) lo escribe SOLO el servidor (cobro con Flow).
-- ---------------------------------------------------------------------------
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'gratis' check (plan in ('gratis', 'pro')),
  creado timestamptz not null default now()
);

alter table public.perfiles enable row level security;

drop policy if exists "ver mi perfil" on public.perfiles;
create policy "ver mi perfil" on public.perfiles
  for select to authenticated
  using (auth.uid() = id);
-- No hay políticas de insert/update/delete: desde el navegador nadie puede
-- cambiarse el plan. El servicio de cobro usa la clave service_role.

-- Cada usuario nuevo recibe su perfil.
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Perfiles para usuarios que ya existían antes de este script.
insert into public.perfiles (id) select id from auth.users on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Datos: una fila por usuario y clave (hoy solo 'respaldo').
-- ---------------------------------------------------------------------------
create table if not exists public.datos_usuario (
  user_id uuid not null references auth.users (id) on delete cascade,
  clave text not null,
  contenido jsonb not null,
  actualizado timestamptz not null default now(),
  dispositivo text not null,
  primary key (user_id, clave)
);

alter table public.datos_usuario enable row level security;

drop policy if exists "leer mis datos" on public.datos_usuario;
create policy "leer mis datos" on public.datos_usuario
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "crear mis datos" on public.datos_usuario;
create policy "crear mis datos" on public.datos_usuario
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "actualizar mis datos" on public.datos_usuario;
create policy "actualizar mis datos" on public.datos_usuario
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "borrar mis datos" on public.datos_usuario;
create policy "borrar mis datos" on public.datos_usuario
  for delete to authenticated using (auth.uid() = user_id);

-- Tope de tamaño por copia (5 MB): evita que una cuenta llene la base con un JSON gigante.
-- Un respaldo normal pesa cientos de KB. Se puede volver a ejecutar sin problema.
alter table public.datos_usuario drop constraint if exists contenido_tamano;
alter table public.datos_usuario add constraint contenido_tamano check (pg_column_size(contenido) <= 5000000) not valid;

-- Una sola fila por cuenta: sin esto una cuenta podía crear 'x1', 'x2'… de 5 MB cada una.
-- `not valid` no revisa filas que ya existan; las nuevas sí se validan.
alter table public.datos_usuario drop constraint if exists clave_unica_permitida;
alter table public.datos_usuario add constraint clave_unica_permitida check (clave = 'respaldo') not valid;
alter table public.datos_usuario drop constraint if exists dispositivo_largo;
alter table public.datos_usuario add constraint dispositivo_largo check (length(dispositivo) <= 64) not valid;

-- Más adelante, cuando la sincronización sea Pro, se exige el plan en las
-- políticas de insert/update, por ejemplo:
--   with check (auth.uid() = user_id and exists (select 1 from public.perfiles p where p.id = auth.uid() and p.plan = 'pro'))

-- ---------------------------------------------------------------------------
-- Derecho a eliminar la cuenta (Ley 21.719): borra al usuario y, en cascada,
-- su perfil y sus datos.
-- ---------------------------------------------------------------------------
create or replace function public.eliminar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'No hay sesión';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.eliminar_mi_cuenta() to authenticated;

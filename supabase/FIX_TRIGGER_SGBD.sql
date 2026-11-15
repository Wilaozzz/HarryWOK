-- ============================================================
-- FIX_TRIGGER_SGBD.sql
-- HarryWOK — Script de corrección para pegar en Supabase SQL Editor
-- Ejecútalo UNA vez en: Supabase Studio → SQL Editor → New Query
-- ============================================================

-- PASO 1: Verificar y habilitar extensiones necesarias
create extension if not exists "pgcrypto" schema extensions;

-- PASO 2: Reemplazar el trigger con versión corregida
-- (usa md5+random sin depender de gen_random_bytes con search_path limitado)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  new_customer_code text;
  raw_role          text;
  assigned_role     text;
  attempt           int := 0;
begin
  -- Generar código único HW-XXXXXX con reintento si colisiona
  loop
    new_customer_code := 'HW-' || upper(substring(
      md5(new.id::text || clock_timestamp()::text || attempt::text)
      from 1 for 6
    ));

    exit when not exists (
      select 1 from public.profiles where customer_code = new_customer_code
    );

    attempt := attempt + 1;
    if attempt > 10 then
      -- fallback: usar fragmento del UUID directamente
      new_customer_code := 'HW-' || upper(substring(replace(new.id::text, '-', '') from 1 for 6));
      exit;
    end if;
  end loop;

  -- Validar rol desde metadata del usuario
  raw_role := coalesce(new.raw_user_meta_data->>'role', 'cliente');
  if raw_role in ('admin', 'cajero', 'cliente') then
    assigned_role := raw_role;
  else
    assigned_role := 'cliente';
  end if;

  -- Insertar perfil (ON CONFLICT para idempotencia)
  insert into public.profiles (
    id,
    role,
    full_name,
    email,
    phone,
    customer_code
  ) values (
    new.id,
    assigned_role,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    new.email,
    new.phone,
    new_customer_code
  )
  on conflict (id) do update set
    email      = excluded.email,
    updated_at = now();

  return new;

exception when others then
  -- Si algo falla, loguear sin bloquear el registro del usuario
  raise warning 'handle_new_user error for uid=%: %', new.id, sqlerrm;
  return new;
end;
$$;

-- Recrear el trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- PASO 3: Política RLS — permitir que el trigger (security definer)
-- pueda insertar perfiles incluso cuando aún no hay sesión activa
-- ============================================================
drop policy if exists profiles_insert_owner on public.profiles;
create policy profiles_insert_owner on public.profiles
  for insert with check (
    id = auth.uid()           -- usuario crea su propio perfil desde cliente
    or auth.uid() is null     -- trigger en contexto de signup (sin sesión JWT aún)
  );

-- ============================================================
-- PASO 4: Backfill — crear perfiles para usuarios existentes en auth.users
-- que no tienen perfil aún (por registros antes del trigger)
-- ============================================================
do $$
declare
  rec       record;
  gen_code  text;
  attempt   int;
begin
  for rec in
    select u.id, u.email, u.phone, u.raw_user_meta_data
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    attempt := 0;
    loop
      gen_code := 'HW-' || upper(substring(
        md5(rec.id::text || clock_timestamp()::text || attempt::text)
        from 1 for 6
      ));
      exit when not exists (
        select 1 from public.profiles where customer_code = gen_code
      );
      attempt := attempt + 1;
      exit when attempt > 10;
    end loop;

    insert into public.profiles (
      id, role, full_name, email, phone, customer_code
    ) values (
      rec.id,
      coalesce(
        case when (rec.raw_user_meta_data->>'role') in ('admin','cajero','cliente')
             then rec.raw_user_meta_data->>'role'
             else 'cliente' end,
        'cliente'
      ),
      coalesce(
        rec.raw_user_meta_data->>'full_name',
        rec.raw_user_meta_data->>'name',
        ''
      ),
      rec.email,
      rec.phone,
      gen_code
    )
    on conflict (id) do nothing;

    raise notice 'Backfill perfil creado: uid=% code=%', rec.id, gen_code;
  end loop;
end;
$$;

-- ============================================================
-- PASO 5: Verificación — ejecuta estas queries para confirmar
-- ============================================================

-- Ver todos los perfiles creados:
select id, role, email, full_name, customer_code, created_at
from public.profiles
order by created_at desc;

-- Comparar usuarios vs perfiles (debe salir 0 si todo está ok):
select u.id, u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

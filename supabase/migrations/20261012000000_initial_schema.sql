-- ============================================================
-- 20261012000000_initial_schema.sql
-- HarryWOK: Esquema inicial con fidelización dual y triggers de usuario
-- ============================================================

-- Habilitar extensión para funciones criptográficas y UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. locals: Restaurantes o establecimientos
-- ============================================================
create table if not exists public.locals (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  address       text,
  timezone      text not null default 'UTC',
  phone         text,
  email         text unique,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists locals_email_idx on public.locals(email);

-- ============================================================
-- 2. profiles: Perfiles de usuario vinculados 1:1 con auth.users
-- ============================================================
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  local_id              uuid references public.locals(id) on delete set null,
  role                  text not null default 'cliente' check (role in ('admin', 'cajero', 'cliente')),
  full_name             text,
  phone                 text unique,
  email                 text unique,
  customer_code         text unique,
  privacy_consent_at    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint profiles_role_assignment_check check (
    (role = 'admin' and local_id is not null) or
    (role = 'cajero' and local_id is not null) or
    (role = 'cliente')
  )
);

create index if not exists profiles_phone_idx on public.profiles(phone);
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_local_id_idx on public.profiles(local_id);
create index if not exists profiles_customer_code_idx on public.profiles(customer_code);

-- ============================================================
-- 3. categories: Categorías del menú
-- ============================================================
create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  local_id      uuid not null references public.locals(id) on delete cascade,
  name          text not null,
  sort_order    integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (local_id, name, active)
);

create index if not exists categories_local_idx on public.categories(local_id, active);

-- ============================================================
-- 4. menu_items: Platos del menú con soft delete
-- ============================================================
create table if not exists public.menu_items (
  id                uuid primary key default gen_random_uuid(),
  local_id          uuid not null references public.locals(id) on delete cascade,
  category_id       uuid not null references public.categories(id) on delete restrict,
  name              text not null,
  description       text,
  price             numeric(10,2) not null check (price >= 0),
  image_url         text,
  available         boolean not null default true,
  deleted_at        timestamptz,
  allergens         text[],
  dietary_tags      text[],
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists menu_items_category_idx on public.menu_items(category_id);
create index if not exists menu_items_local_idx on public.menu_items(local_id, available, deleted_at);

-- ============================================================
-- 5. point_rules: Reglas de acumulación (modelo dual)
-- ============================================================
create table if not exists public.point_rules (
  id                    uuid primary key default gen_random_uuid(),
  local_id              uuid not null references public.locals(id) on delete cascade,
  type                  text not null default 'por_visita' check (type in ('por_visita', 'por_importe')),
  name                  text not null,
  points                integer not null check (points > 0),
  amount_per_point      numeric(10,2),
  threshold_points      integer,
  daily_cap             integer,
  valid_from            timestamptz not null default now(),
  valid_to              timestamptz,
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists point_rules_local_active_idx on public.point_rules(local_id, active, valid_from, valid_to);

-- ============================================================
-- 6. visits: Visitas registradas en caja
-- ============================================================
create table if not exists public.visits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  local_id        uuid not null references public.locals(id) on delete restrict,
  cashier_id      uuid references public.profiles(id) on delete set null,
  amount          numeric(10,2),
  visited_day     date not null,
  created_at      timestamptz not null default now(),
  unique (user_id, local_id, visited_day)
);

create index if not exists visits_user_idx on public.visits(user_id);
create index if not exists visits_local_idx on public.visits(local_id);
create index if not exists visits_day_idx on public.visits(visited_day);

-- ============================================================
-- 7. campaigns: Campañas de recompensas y cupones
-- ============================================================
create table if not exists public.campaigns (
  id               uuid primary key default gen_random_uuid(),
  local_id         uuid not null references public.locals(id) on delete cascade,
  name             text not null,
  description      text,
  threshold_points integer not null check (threshold_points > 0),
  coupon_code      text unique,
  code_hash        text,
  reward_type      text not null default 'punto' check (reward_type in ('sello', 'punto')),
  expires_at       timestamptz,
  redeemed_count   integer not null default 0,
  max_redemptions  integer,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists campaigns_local_active_idx on public.campaigns(local_id, active);

-- ============================================================
-- 8. coupons: Cupones emitidos para clientes (con code_hash y TTL)
-- ============================================================
create table if not exists public.coupons (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete restrict,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  coupon_code     text,
  code_hash       text,
  issued_at       timestamptz not null default now(),
  expires_at      timestamptz,
  redeemed_at     timestamptz,
  status          text not null default 'active' check (status in ('active', 'redeemed', 'expired'))
);

create index if not exists coupons_campaign_idx on public.coupons(campaign_id);
create index if not exists coupons_user_status_idx on public.coupons(user_id, status);
create index if not exists coupons_code_hash_idx on public.coupons(code_hash);

-- ============================================================
-- 9. redemptions: Histórico de canjes
-- ============================================================
create table if not exists public.redemptions (
  id              uuid primary key default gen_random_uuid(),
  coupon_id       uuid not null references public.coupons(id) on delete restrict,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  cashier_id      uuid references public.profiles(id) on delete set null,
  local_id        uuid references public.locals(id) on delete set null,
  redeemed_at     timestamptz not null default now(),
  amount          numeric(10,2),
  notes           text
);

create index if not exists redemptions_coupon_idx on public.redemptions(coupon_id);
create index if not exists redemptions_user_idx on public.redemptions(user_id);

-- ============================================================
-- 10. point_movements: Movimientos de saldo (append-only)
-- ============================================================
create table if not exists public.point_movements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  kind            text not null check (kind in ('acumulo', 'canje', 'ajuste_admin')),
  delta           integer not null,
  balance_after   integer not null,
  visit_id        uuid references public.visits(id) on delete set null,
  campaign_id     uuid references public.campaigns(id) on delete set null,
  rule_id         uuid references public.point_rules(id) on delete set null,
  reason          text,
  created_at      timestamptz not null default now()
);

create index if not exists pm_user_created_idx on public.point_movements(user_id, created_at desc);
create index if not exists pm_visit_idx on public.point_movements(visit_id);

-- ============================================================
-- 11. audit_log: Traza inmutable y seudonimizada
-- ============================================================
create table if not exists public.audit_log (
  id                uuid primary key default gen_random_uuid(),
  actor_ref         text not null,
  actor_ref_version integer not null default 1,
  event             text not null,
  entity            text not null,
  entity_id         text not null,
  details           jsonb,
  occurred_at       timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on public.audit_log(entity, entity_id);
create index if not exists audit_log_at_idx on public.audit_log(occurred_at desc);

-- ============================================================
-- 12. app_settings: Configuración global en caliente
-- ============================================================
create table if not exists public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

-- ============================================================
-- 13. Helper: auth_role()
-- ============================================================
create or replace function public.auth_role() returns text as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'anonymous'
  );
$$ language sql stable security definer;

-- ============================================================
-- 14. Trigger de Registro Automático de Perfiles de Usuario
-- ============================================================
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
  assigned_local_id uuid := null;
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
      new_customer_code := 'HW-' || upper(substring(replace(new.id::text, '-', '') from 1 for 6));
      exit;
    end if;
  end loop;

  raw_role := coalesce(new.raw_user_meta_data->>'role', 'cliente');
  if raw_role in ('admin', 'cajero', 'cliente') then
    assigned_role := raw_role;
  else
    assigned_role := 'cliente';
  end if;

  -- Asignar local_id si el rol es admin o cajero para cumplir con profiles_role_assignment_check
  if assigned_role in ('admin', 'cajero') then
    begin
      assigned_local_id := coalesce(
        (new.raw_user_meta_data->>'local_id')::uuid,
        (select id from public.locals where is_active = true order by created_at asc limit 1)
      );
    exception when others then
      assigned_local_id := (select id from public.locals where is_active = true order by created_at asc limit 1);
    end;
  else
    assigned_local_id := null;
  end if;

  insert into public.profiles (
    id,
    local_id,
    role,
    full_name,
    email,
    phone,
    customer_code
  ) values (
    new.id,
    assigned_local_id,
    assigned_role,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    new.phone,
    new_customer_code
  )
  on conflict (id) do update set
    local_id = excluded.local_id,
    role = excluded.role,
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();

  return new;

exception when others then
  raise warning 'handle_new_user error for uid=%: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 15. Políticas de Seguridad RLS (Row Level Security)
-- ============================================================
alter table public.locals enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.point_rules enable row level security;
alter table public.visits enable row level security;
alter table public.campaigns enable row level security;
alter table public.coupons enable row level security;
alter table public.redemptions enable row level security;
alter table public.point_movements enable row level security;
alter table public.audit_log enable row level security;
alter table public.app_settings enable row level security;

-- locals
create policy locals_select_all on public.locals
  for select using (true);
create policy locals_crud_admin on public.locals
  for all using (public.auth_role() = 'admin');

-- profiles
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.auth_role() in ('admin', 'cajero'));
create policy profiles_update_owner on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_owner on public.profiles
  for insert with check (
    id = auth.uid()        -- usuario autenticado crea su propio perfil
    or auth.uid() is null  -- trigger de signup (security definer, sin sesión JWT activa)
  );

-- categories
create policy categories_select on public.categories
  for select using (active = true or public.auth_role() = 'admin');
create policy categories_crud_admin on public.categories
  for all using (public.auth_role() = 'admin');

-- menu_items
create policy menu_items_select on public.menu_items
  for select using ((available = true and deleted_at is null) or public.auth_role() = 'admin');
create policy menu_items_crud_admin on public.menu_items
  for all using (public.auth_role() = 'admin');

-- point_rules
create policy point_rules_select on public.point_rules
  for select using (true);
create policy point_rules_crud_admin on public.point_rules
  for all using (public.auth_role() = 'admin');

-- visits
create policy visits_select on public.visits
  for select using (user_id = auth.uid() or public.auth_role() in ('admin', 'cajero'));
create policy visits_insert_staff on public.visits
  for insert with check (public.auth_role() in ('admin', 'cajero'));

-- campaigns
create policy campaigns_select on public.campaigns
  for select using (active = true or public.auth_role() = 'admin');
create policy campaigns_crud_admin on public.campaigns
  for all using (public.auth_role() = 'admin');

-- coupons
create policy coupons_select on public.coupons
  for select using (user_id = auth.uid() or public.auth_role() in ('admin', 'cajero'));
create policy coupons_insert_staff on public.coupons
  for insert with check (public.auth_role() in ('admin', 'cajero'));
create policy coupons_update_staff on public.coupons
  for update using (public.auth_role() in ('admin', 'cajero'));

-- redemptions
create policy redemptions_select on public.redemptions
  for select using (user_id = auth.uid() or public.auth_role() in ('admin', 'cajero'));
create policy redemptions_insert_staff on public.redemptions
  for insert with check (public.auth_role() in ('admin', 'cajero'));

-- point_movements
create policy pm_select on public.point_movements
  for select using (user_id = auth.uid() or public.auth_role() in ('admin', 'cajero'));
create policy pm_insert_staff on public.point_movements
  for insert with check (public.auth_role() in ('admin', 'cajero'));

-- audit_log
create policy audit_log_select_staff on public.audit_log
  for select using (public.auth_role() in ('admin', 'cajero'));

-- app_settings
create policy app_settings_select on public.app_settings
  for select using (true);
create policy app_settings_crud_admin on public.app_settings
  for all using (public.auth_role() = 'admin');

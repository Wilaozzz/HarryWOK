-- ============================================================
-- seed.sql
-- Datos semilla iniciales para HarryWOK
-- ============================================================

-- 1. Restaurante principal
insert into public.locals (id, name, description, address, timezone, phone, email, is_active)
values (
  '11111111-1111-1111-1111-111111111111',
  'HarryWOK Central',
  'Restaurante de comida oriental y wok tradicional',
  'Av. Principal Gastronómica #123, Sala 1',
  'America/Caracas',
  '+584120000000',
  'contacto@harrywok.com',
  true
)
on conflict (id) do nothing;

-- 2. Configuración de aplicación
insert into public.app_settings (key, value)
values
  ('redemption_ttl_minutes', '10'),
  ('redemption_lockout_duration_minutes', '5')
on conflict (key) do update set value = excluded.value;

-- 3. Reglas de fidelización activa (10 puntos fijos por visita)
insert into public.point_rules (
  id, local_id, type, name, points, daily_cap, active, valid_from
)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'por_visita',
  'Acumulación estándar por visita',
  10,
  50,
  true,
  now() - interval '1 day'
)
on conflict (id) do nothing;

-- 4. Categorías del menú
insert into public.categories (id, local_id, name, sort_order, active)
values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'Woks & Salteados', 1, true),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'Arroces Orientales', 2, true),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'Entrantes & Dim Sum', 3, true),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111111', 'Bebidas & Tés', 4, true)
on conflict (id) do nothing;

-- 5. Platos del menú
insert into public.menu_items (id, local_id, category_id, name, description, price, available, sort_order)
values
  (
    '44444444-4444-4444-4444-444444444401',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333301',
    'Wok Harry Especial',
    'Fideos al dente salteados con pollo, ternera, vegetales frescos y salsa de la casa.',
    8.50,
    true,
    1
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333301',
    'Wok Teriyaki de Pollo',
    'Tiras de pollo salteadas al wok con sésamo, cebolleta y salsa teriyaki artesanal.',
    7.90,
    true,
    2
  ),
  (
    '44444444-4444-4444-4444-444444444403',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333302',
    'Arroz Chaufa Mixto',
    'Arroz frito al wok con huevo, cebollín, trozos de pollo, cerdo ahumado y soja.',
    6.50,
    true,
    1
  ),
  (
    '44444444-4444-4444-4444-444444444404',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333303',
    'Gyozas de Cerdo (4 uds)',
    'Empanadillas japonesas a la plancha rellenas de carne de cerdo y col china.',
    4.50,
    true,
    1
  ),
  (
    '44444444-4444-4444-4444-444444444405',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333304',
    'Té Verde Helado con Limón',
    'Infusión natural refrescante con un toque cítrico.',
    2.00,
    true,
    1
  )
on conflict (id) do nothing;

-- 6. Campaña inicial de cupones para canje
insert into public.campaigns (
  id, local_id, name, description, threshold_points, reward_type, active
)
values (
  '55555555-5555-5555-5555-555555555501',
  '11111111-1111-1111-1111-111111111111',
  'Cupón Bebida Gratis',
  'Canjea 30 puntos por una bebida gratis en tu próximo consumo.',
  30,
  'punto',
  true
)
on conflict (id) do nothing;

-- 7. Usuarios y Perfiles Iniciales (Admin, Cajero, Cliente Demo)
-- Contraseña para todos: password123

-- 7.1 Administrador General
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'admin@harrywok.com',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin","full_name":"Administrador HarryWOK"}',
  now(), now(), '', '', '', ''
) on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_user_meta_data = excluded.raw_user_meta_data;

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) values (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000001', 'admin@harrywok.com')::jsonb,
  'email', 'admin@harrywok.com', now(), now(), now()
) on conflict (provider, provider_id) do nothing;

-- 7.2 Cajero Principal
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'c0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'cajero@harrywok.com',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"cajero","full_name":"Cajero Principal"}',
  now(), now(), '', '', '', ''
) on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_user_meta_data = excluded.raw_user_meta_data;

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) values (
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  format('{"sub":"%s","email":"%s"}', 'c0000000-0000-0000-0000-000000000001', 'cajero@harrywok.com')::jsonb,
  'email', 'cajero@harrywok.com', now(), now(), now()
) on conflict (provider, provider_id) do nothing;

-- 7.3 Cliente Demo
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'd0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'cliente@harrywok.com',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"cliente","full_name":"Cliente Frecuente Demo"}',
  now(), now(), '', '', '', ''
) on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_user_meta_data = excluded.raw_user_meta_data;

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) values (
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  format('{"sub":"%s","email":"%s"}', 'd0000000-0000-0000-0000-000000000001', 'cliente@harrywok.com')::jsonb,
  'email', 'cliente@harrywok.com', now(), now(), now()
) on conflict (provider, provider_id) do nothing;

-- 7.4 Asegurar perfiles en public.profiles con roles explícitos y códigos fijos
insert into public.profiles (
  id, local_id, role, full_name, email, customer_code
) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin', 'Administrador HarryWOK', 'admin@harrywok.com', 'HW-ADM001'),
  ('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cajero', 'Cajero Principal', 'cajero@harrywok.com', 'HW-CAJ001'),
  ('d0000000-0000-0000-0000-000000000001', null, 'cliente', 'Cliente Frecuente Demo', 'cliente@harrywok.com', 'HW-DEMO01')
on conflict (id) do update set
  local_id = excluded.local_id,
  role = excluded.role,
  full_name = excluded.full_name,
  email = excluded.email,
  customer_code = excluded.customer_code;

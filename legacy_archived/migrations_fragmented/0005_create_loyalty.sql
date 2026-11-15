-- ========================================
-- supabase/migrations/0004_create_loyalty.sql
-- Tablas de fidelización: visits, redemptions, point_movements
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla visits (visitas registradas)
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locals(id) ON DELETE RESTRICT,
  cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10,2),
  visited_day DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, local_id, visited_day)
);

CREATE INDEX IF NOT EXISTS visits_user_idx ON visits(user_id);
CREATE INDEX IF NOT EXISTS visits_local_idx ON visits(local_id);
CREATE INDEX IF NOT EXISTS visits_day_idx ON visits(visited_day);

-- Tabla point_movements (movimientos de puntos y sellos)
CREATE TABLE IF NOT EXISTS point_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('acumulo', 'canje', 'ajuste_admin', 'reward')),
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES point_rules(id) ON DELETE SET NULL,
  reason TEXT,
  reward_type TEXT,
  reward_discount TEXT,
  reward_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pm_user_created_idx ON point_movements(user_id, created_at DESC);

-- Tabla redemptions (histórico de canjes)
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  local_id UUID REFERENCES locals(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount NUMERIC(10,2),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS redemptions_user_idx ON redemptions(user_id);
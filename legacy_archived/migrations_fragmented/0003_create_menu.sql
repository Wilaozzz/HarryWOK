-- ========================================
-- supabase/migrations/0003_create_menu.sql
-- Tabla de categorías y productos del menú
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (local_id, name, active)
);

CREATE INDEX IF NOT EXISTS categories_local_id_idx ON categories(local_id);
CREATE INDEX IF NOT EXISTS categories_active_idx ON categories(active);

-- Tabla menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locals(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  allergens TEXT[],
  dietary_tags TEXT[],
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE menu_items ADD CONSTRAINT check_menu_available_deleted_at CHECK (NOT (available = false AND deleted_at IS NULL));

CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS menu_items_local_available_idx ON menu_items(local_id, available, deleted_at);
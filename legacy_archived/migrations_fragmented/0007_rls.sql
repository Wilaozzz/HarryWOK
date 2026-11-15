-- ========================================
-- supabase/migrations/0007_rls.sql
-- Políticas de Row Level Security (RLS)
-- ========================================

-- Habilitar RLS en todas las tablas que lo requieren
ALTER TABLE locals ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS para profiles (RNF-05, RNF-10)
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update_consent_only ON profiles FOR UPDATE USING (auth.uid() = id AND (privacy_consent_at IS NULL OR auth.role() != 'anonymous'));

-- POLÍTICAS para categories
CREATE POLICY categories_select_active ON categories FOR SELECT USING (active = true);

-- POLÍTICAS para menu_items
CREATE POLICY menu_items_select_public ON menu_items FOR SELECT USING (available = true AND deleted_at IS NULL);
CREATE POLICY menu_items_crud_admin ON menu_items FOR ALL USING (auth.role() = 'admin');

-- POLÍTICAS para point_rules
CREATE POLICY point_rules_select_auth ON point_rules FOR SELECT USING (auth.role() != 'anonymous');

-- POLÍTICAS para visits
CREATE POLICY visits_select_own ON visits FOR SELECT USING (user_id = auth.uid());
CREATE POLICY visits_insert_cashier ON visits FOR INSERT WITH CHECK ( EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('cajero', 'admin')) );

-- POLÍTICAS para campaigns
CREATE POLICY campaigns_select_active ON campaigns FOR SELECT USING (active = true);

-- POLÍTICAS para coupons
CREATE POLICY coupons_select_own ON coupons FOR SELECT USING (user_id = auth.uid());
CREATE POLICY coupons_insert_admin_manual ON coupons FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'cajero'))
);

-- POLÍTICAS para redemptions
CREATE POLICY redemptions_select_own ON redemptions FOR SELECT USING (user_id = auth.uid());

-- POLÍTICAS para point_movements
CREATE POLICY point_movements_select_own ON point_movements FOR SELECT USING (user_id = auth.uid());

-- POLÍTICAS para audit_log
CREATE POLICY audit_log_select ON audit_log FOR SELECT USING (true);
CREATE POLICY audit_log_insert ON audit_log FOR INSERT WITH CHECK (true);
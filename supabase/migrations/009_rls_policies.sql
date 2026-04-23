-- Row Level Security Policies
-- Secure access to all tables based on user roles

-- ============================================================================
-- PROFILES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile on signup
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- SUPPLIERS
-- ============================================================================

-- Anyone can view active suppliers (needed for search)
CREATE POLICY "Anyone can view active suppliers"
  ON suppliers FOR SELECT
  USING (active = true OR id = auth.uid());

-- Suppliers can update their own details
CREATE POLICY "Suppliers can update own details"
  ON suppliers FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- PARTS
-- ============================================================================

-- Anyone can view parts (public catalog)
CREATE POLICY "Anyone can view parts"
  ON parts FOR SELECT
  USING (true);

-- ============================================================================
-- SUPPLIER INVENTORY
-- ============================================================================

-- Anyone can view inventory with stock > 0
CREATE POLICY "Anyone can view available inventory"
  ON supplier_inventory FOR SELECT
  USING (stock > 0 OR supplier_id = auth.uid());

-- Suppliers can manage their own inventory
CREATE POLICY "Suppliers can manage own inventory"
  ON supplier_inventory FOR ALL
  USING (supplier_id = auth.uid())
  WITH CHECK (supplier_id = auth.uid());

-- ============================================================================
-- VEHICLES
-- ============================================================================

-- Users can view their own vehicles
CREATE POLICY "Users can view own vehicles"
  ON vehicles FOR SELECT
  USING (user_id = auth.uid());

-- Users can manage their own vehicles
CREATE POLICY "Users can manage own vehicles"
  ON vehicles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- COUPON ISSUES
-- ============================================================================

-- Users can view their own coupons
CREATE POLICY "Users can view own coupons"
  ON coupon_issues FOR SELECT
  USING (user_id = auth.uid());

-- Suppliers can view coupons for their store
CREATE POLICY "Suppliers can view own store coupons"
  ON coupon_issues FOR SELECT
  USING (supplier_id = auth.uid());

-- Only authenticated users can have coupons issued (via function)
CREATE POLICY "Authenticated users can have coupons issued"
  ON coupon_issues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Suppliers can redeem coupons for their store
CREATE POLICY "Suppliers can redeem own store coupons"
  ON coupon_issues FOR UPDATE
  USING (
    supplier_id = auth.uid()
    AND status IN ('issued', 'opened', 'navigation_started')
    AND redeemed_at IS NULL
  )
  WITH CHECK (
    supplier_id = auth.uid()
    AND status = 'redeemed'
  );

-- ============================================================================
-- COUPON EVENTS
-- ============================================================================

-- Users can view events for their coupons
CREATE POLICY "Users can view own coupon events"
  ON coupon_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coupon_issues ci
      WHERE ci.id = coupon_events.coupon_id
        AND ci.user_id = auth.uid()
    )
  );

-- Suppliers can view events for their coupons
CREATE POLICY "Suppliers can view own store coupon events"
  ON coupon_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coupon_issues ci
      WHERE ci.id = coupon_events.coupon_id
        AND ci.supplier_id = auth.uid()
    )
  );

-- Anyone can insert events (via function with validation)
CREATE POLICY "Authenticated users can log events"
  ON coupon_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- SETTLEMENTS
-- ============================================================================

-- Suppliers can view their own settlements
CREATE POLICY "Suppliers can view own settlements"
  ON supplier_monthly_settlements FOR SELECT
  USING (supplier_id = auth.uid());

-- Suppliers can view their own settlement line items
CREATE POLICY "Suppliers can view own settlement items"
  ON settlement_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM supplier_monthly_settlements sms
      WHERE sms.id = settlement_line_items.settlement_id
        AND sms.supplier_id = auth.uid()
    )
  );

-- ============================================================================
-- ADMIN POLICIES (Optional - for admin dashboard)
-- ============================================================================

-- Admin can view all data (uncomment if you have admin role)
/*
CREATE POLICY "Admin full access to profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin full access to settlements"
  ON supplier_monthly_settlements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
*/

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if user is supplier
CREATE OR REPLACE FUNCTION auth.is_supplier()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'supplier'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON POLICY "Users can view own profile" ON profiles IS 'Users can only see their own profile data';
COMMENT ON POLICY "Anyone can view active suppliers" ON suppliers IS 'Public catalog of active suppliers';
COMMENT ON POLICY "Users can view own coupons" ON coupon_issues IS 'Users see only their issued coupons';
COMMENT ON POLICY "Suppliers can redeem own store coupons" ON coupon_issues IS 'Suppliers can only redeem coupons for their own store';

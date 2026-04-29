-- Client coupon notification access.
-- Allows authenticated clients to read their own coupons for notification alerts.

GRANT SELECT ON coupon_issues TO authenticated;

DROP POLICY IF EXISTS "Users can view own coupons" ON coupon_issues;
CREATE POLICY "Users can view own coupons"
  ON coupon_issues FOR SELECT
  USING (user_id = auth.uid());

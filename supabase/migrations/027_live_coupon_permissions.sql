-- Live coupon issue/event permissions.
-- Allows authenticated clients to issue coupons and record lifecycle events through RPCs.

GRANT SELECT, INSERT, UPDATE ON coupon_issues TO authenticated;
GRANT SELECT, INSERT ON coupon_events TO authenticated;

GRANT EXECUTE ON FUNCTION issue_coupon(UUID, UUID, UUID, UUID, NUMERIC, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION log_coupon_event(UUID, event_type, UUID, JSONB) TO authenticated;

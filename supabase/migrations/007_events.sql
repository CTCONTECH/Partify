-- Event Tracking Tables

CREATE TABLE coupon_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupon_issues(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- User or supplier who triggered event
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX coupon_events_coupon_idx ON coupon_events(coupon_id);
CREATE INDEX coupon_events_type_idx ON coupon_events(event_type);
CREATE INDEX coupon_events_created_idx ON coupon_events(created_at DESC);
CREATE INDEX coupon_events_actor_idx ON coupon_events(actor_id);

-- Function to log coupon event
CREATE OR REPLACE FUNCTION log_coupon_event(
  p_coupon_id UUID,
  p_event_type event_type,
  p_actor_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO coupon_events (coupon_id, event_type, actor_id, metadata)
  VALUES (p_coupon_id, p_event_type, p_actor_id, p_metadata)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Trigger to update coupon status on events
CREATE OR REPLACE FUNCTION update_coupon_status_on_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Update coupon timestamps based on event type
  CASE NEW.event_type
    WHEN 'coupon_viewed' THEN
      UPDATE coupon_issues
      SET status = 'opened', opened_at = NEW.created_at
      WHERE id = NEW.coupon_id AND status = 'issued';

    WHEN 'navigation_started' THEN
      UPDATE coupon_issues
      SET status = 'navigation_started', navigation_started_at = NEW.created_at
      WHERE id = NEW.coupon_id AND status IN ('issued', 'opened');

    WHEN 'coupon_redeemed' THEN
      UPDATE coupon_issues
      SET status = 'redeemed',
          redeemed_at = NEW.created_at,
          redeemed_by = NEW.actor_id,
          actual_order_amount = COALESCE((NEW.metadata->>'order_amount')::decimal, original_price)
      WHERE id = NEW.coupon_id
        AND status IN ('issued', 'opened', 'navigation_started')
        AND redeemed_at IS NULL; -- Prevent duplicate redemption

    WHEN 'coupon_expired' THEN
      UPDATE coupon_issues
      SET status = 'expired', expired_at = NEW.created_at
      WHERE id = NEW.coupon_id AND status != 'redeemed';

    WHEN 'coupon_cancelled' THEN
      UPDATE coupon_issues
      SET status = 'cancelled', cancelled_at = NEW.created_at
      WHERE id = NEW.coupon_id AND status != 'redeemed';
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coupon_status_trigger
  AFTER INSERT ON coupon_events
  FOR EACH ROW
  EXECUTE FUNCTION update_coupon_status_on_event();

-- Function to expire old coupons (run via cron)
CREATE OR REPLACE FUNCTION expire_old_coupons()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE coupon_issues
    SET status = 'expired', expired_at = NOW()
    WHERE status IN ('issued', 'opened', 'navigation_started')
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  -- Log events for expired coupons
  INSERT INTO coupon_events (coupon_id, event_type)
  SELECT id, 'coupon_expired'::event_type
  FROM coupon_issues
  WHERE status = 'expired' AND expired_at > NOW() - INTERVAL '1 minute';

  RETURN v_count;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- RLS
ALTER TABLE coupon_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE coupon_events IS 'Audit log of all coupon lifecycle events';
COMMENT ON FUNCTION log_coupon_event IS 'Log a coupon event and update coupon status';
COMMENT ON FUNCTION expire_old_coupons IS 'Expire coupons past their expiry time (run via cron)';

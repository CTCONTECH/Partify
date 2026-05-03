-- Coupon event trigger case fix.
-- `coupon_issued` is logged as an audit event after issue_coupon(), but issuing
-- already creates the coupon in the correct state. Treat it as a no-op here.

CREATE OR REPLACE FUNCTION public.update_coupon_status_on_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  CASE NEW.event_type
    WHEN 'coupon_issued' THEN
      NULL;

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
        AND redeemed_at IS NULL;

    WHEN 'coupon_expired' THEN
      UPDATE coupon_issues
      SET status = 'expired', expired_at = NEW.created_at
      WHERE id = NEW.coupon_id AND status != 'redeemed';

    WHEN 'coupon_cancelled' THEN
      UPDATE coupon_issues
      SET status = 'cancelled', cancelled_at = NEW.created_at
      WHERE id = NEW.coupon_id AND status != 'redeemed';

    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_coupon_status_on_event()
  IS 'Updates coupon lifecycle state from coupon_events; coupon_issued is an audit-only event';

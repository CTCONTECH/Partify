-- Idempotent client coupon lifecycle event logging.
-- Reopening or refreshing a coupon should not create repeated viewed events.

CREATE OR REPLACE FUNCTION public.log_coupon_event(
  p_coupon_id UUID,
  p_event_type event_type,
  p_actor_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_coupon coupon_issues%ROWTYPE;
  v_actor_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_coupon
  FROM coupon_issues
  WHERE id = p_coupon_id;

  IF v_coupon.id IS NULL THEN
    RAISE EXCEPTION 'Coupon not found';
  END IF;

  v_actor_id := COALESCE(p_actor_id, auth.uid());

  IF v_actor_id <> auth.uid() THEN
    RAISE EXCEPTION 'Actor must match current user';
  END IF;

  CASE p_event_type
    WHEN 'coupon_issued', 'coupon_viewed', 'navigation_started' THEN
      IF v_coupon.user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Only the coupon owner can log this event';
      END IF;
    WHEN 'coupon_redeemed' THEN
      IF v_coupon.supplier_id <> auth.uid() THEN
        RAISE EXCEPTION 'Only the owning supplier can redeem this coupon';
      END IF;
    WHEN 'coupon_expired', 'coupon_cancelled' THEN
      RAISE EXCEPTION 'This event type is system managed';
  END CASE;

  IF p_event_type IN ('coupon_issued', 'coupon_viewed', 'navigation_started') THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_coupon_id::text || ':' || p_event_type::text));

    SELECT id
    INTO v_event_id
    FROM coupon_events
    WHERE coupon_id = p_coupon_id
      AND event_type = p_event_type
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_event_id IS NOT NULL THEN
      RETURN v_event_id;
    END IF;
  END IF;

  INSERT INTO coupon_events (coupon_id, event_type, actor_id, metadata)
  VALUES (p_coupon_id, p_event_type, v_actor_id, p_metadata)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.log_coupon_event(UUID, event_type, UUID, JSONB)
  IS 'Log validated coupon lifecycle events; client issue/view/navigation events are idempotent per coupon';

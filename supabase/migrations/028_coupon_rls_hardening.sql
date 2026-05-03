-- Coupon RLS hardening.
-- Tightens RPC validation and blocks direct event inserts so coupon lifecycle
-- changes always pass through ownership checks in the database.

CREATE OR REPLACE FUNCTION public.issue_coupon(
  p_user_id UUID,
  p_supplier_id UUID,
  p_part_id UUID,
  p_inventory_id UUID,
  p_price DECIMAL,
  p_user_lat DOUBLE PRECISION DEFAULT NULL,
  p_user_lon DOUBLE PRECISION DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_discount_percent DECIMAL;
  v_discount_amount DECIMAL;
  v_final_price DECIMAL;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_coupon_id UUID;
  v_user_location GEOGRAPHY;
  v_inventory_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Cannot issue coupon for another user';
  END IF;

  IF p_inventory_id IS NOT NULL THEN
    SELECT
      id,
      supplier_id,
      part_id,
      price,
      stock
    INTO v_inventory_record
    FROM supplier_inventory
    WHERE id = p_inventory_id;

    IF v_inventory_record.id IS NULL THEN
      RAISE EXCEPTION 'Inventory item not found';
    END IF;

    IF v_inventory_record.supplier_id <> p_supplier_id THEN
      RAISE EXCEPTION 'Inventory item does not belong to supplier';
    END IF;

    IF v_inventory_record.part_id <> p_part_id THEN
      RAISE EXCEPTION 'Inventory item does not match part';
    END IF;

    IF v_inventory_record.stock <= 0 THEN
      RAISE EXCEPTION 'Inventory item is out of stock';
    END IF;

    IF ROUND(v_inventory_record.price::numeric, 2) <> ROUND(p_price::numeric, 2) THEN
      RAISE EXCEPTION 'Coupon price does not match current inventory price';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM supplier_inventory si
      WHERE si.supplier_id = p_supplier_id
        AND si.part_id = p_part_id
        AND si.stock > 0
        AND ROUND(si.price::numeric, 2) = ROUND(p_price::numeric, 2)
    ) THEN
      RAISE EXCEPTION 'No live inventory matches this coupon request';
    END IF;
  END IF;

  SELECT discount_percent INTO v_discount_percent
  FROM suppliers
  WHERE id = p_supplier_id
    AND active = true;

  IF v_discount_percent IS NULL THEN
    RAISE EXCEPTION 'Supplier is not active';
  END IF;

  v_discount_amount := ROUND((p_price * v_discount_percent / 100)::numeric, 2);
  v_final_price := p_price - v_discount_amount;
  v_expires_at := NOW() + INTERVAL '24 hours';

  LOOP
    v_code := generate_coupon_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM coupon_issues WHERE code = v_code);
  END LOOP;

  IF p_user_lat IS NOT NULL AND p_user_lon IS NOT NULL THEN
    v_user_location := ST_SetSRID(ST_MakePoint(p_user_lon, p_user_lat), 4326)::geography;
  END IF;

  INSERT INTO coupon_issues (
    code,
    user_id,
    supplier_id,
    part_id,
    inventory_id,
    original_price,
    discount_percent,
    discount_amount,
    final_price,
    expires_at,
    user_location
  ) VALUES (
    v_code,
    p_user_id,
    p_supplier_id,
    p_part_id,
    p_inventory_id,
    p_price,
    v_discount_percent,
    v_discount_amount,
    v_final_price,
    v_expires_at,
    v_user_location
  )
  RETURNING id INTO v_coupon_id;

  RETURN v_coupon_id;
END;
$$;

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

  INSERT INTO coupon_events (coupon_id, event_type, actor_id, metadata)
  VALUES (p_coupon_id, p_event_type, v_actor_id, p_metadata)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE INSERT ON coupon_events FROM authenticated;

DROP POLICY IF EXISTS "Authenticated users can log events" ON coupon_events;

COMMENT ON FUNCTION public.issue_coupon(UUID, UUID, UUID, UUID, DECIMAL, DOUBLE PRECISION, DOUBLE PRECISION)
  IS 'Issue a coupon only for the authenticated user against live matching inventory';

COMMENT ON FUNCTION public.log_coupon_event(UUID, event_type, UUID, JSONB)
  IS 'Log validated coupon events for the coupon owner or owning supplier only';

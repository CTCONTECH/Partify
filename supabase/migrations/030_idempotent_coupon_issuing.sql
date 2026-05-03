-- Idempotent coupon issuing.
-- Enforces one active coupon per client + supplier + part, while allowing a
-- fresh coupon after the prior one is redeemed, expired, or cancelled.

UPDATE coupon_issues
SET status = 'expired', expired_at = COALESCE(expired_at, NOW())
WHERE status IN ('issued', 'opened', 'navigation_started')
  AND expires_at <= NOW();

WITH ranked_active_coupons AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, supplier_id, part_id
      ORDER BY
        CASE status
          WHEN 'navigation_started' THEN 1
          WHEN 'opened' THEN 2
          WHEN 'issued' THEN 3
          ELSE 4
        END,
        created_at DESC,
        id
    ) AS keep_rank
  FROM coupon_issues
  WHERE status IN ('issued', 'opened', 'navigation_started')
    AND expires_at > NOW()
)
UPDATE coupon_issues ci
SET
  status = 'cancelled',
  cancelled_at = NOW(),
  metadata = COALESCE(ci.metadata, '{}'::jsonb) || jsonb_build_object(
    'cancelled_reason', 'duplicate_active_coupon_cleanup',
    'cancelled_by_migration', '030_idempotent_coupon_issuing'
  )
FROM ranked_active_coupons ranked
WHERE ci.id = ranked.id
  AND ranked.keep_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS coupon_issues_one_active_per_client_supplier_part_idx
  ON coupon_issues (user_id, supplier_id, part_id)
  WHERE status IN ('issued', 'opened', 'navigation_started');

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

  UPDATE coupon_issues
  SET status = 'expired', expired_at = NOW()
  WHERE user_id = p_user_id
    AND supplier_id = p_supplier_id
    AND part_id = p_part_id
    AND status IN ('issued', 'opened', 'navigation_started')
    AND expires_at <= NOW();

  SELECT id
  INTO v_coupon_id
  FROM coupon_issues
  WHERE user_id = p_user_id
    AND supplier_id = p_supplier_id
    AND part_id = p_part_id
    AND status IN ('issued', 'opened', 'navigation_started')
    AND expires_at > NOW()
  ORDER BY
    CASE status
      WHEN 'navigation_started' THEN 1
      WHEN 'opened' THEN 2
      WHEN 'issued' THEN 3
      ELSE 4
    END,
    created_at DESC
  LIMIT 1;

  IF v_coupon_id IS NOT NULL THEN
    RETURN v_coupon_id;
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
EXCEPTION
  WHEN unique_violation THEN
    SELECT id
    INTO v_coupon_id
    FROM coupon_issues
    WHERE user_id = p_user_id
      AND supplier_id = p_supplier_id
      AND part_id = p_part_id
      AND status IN ('issued', 'opened', 'navigation_started')
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_coupon_id IS NOT NULL THEN
      RETURN v_coupon_id;
    END IF;

    RAISE;
END;
$$;

COMMENT ON INDEX coupon_issues_one_active_per_client_supplier_part_idx
  IS 'Prevents duplicate active coupons for the same client, supplier, and part';

COMMENT ON FUNCTION public.issue_coupon(UUID, UUID, UUID, UUID, DECIMAL, DOUBLE PRECISION, DOUBLE PRECISION)
  IS 'Issue or return one active coupon for the authenticated user against live matching inventory';

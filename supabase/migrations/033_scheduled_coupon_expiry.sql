-- Scheduled stale coupon expiry.
-- Keeps active coupon state honest even when expired coupons are not touched by
-- app-side issue/view/navigation logic.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS coupon_issues_active_expiry_idx
  ON public.coupon_issues (expires_at)
  WHERE status IN ('issued', 'opened', 'navigation_started');

CREATE OR REPLACE FUNCTION public.expire_stale_coupons()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('public.expire_stale_coupons'));

  WITH expired AS (
    UPDATE public.coupon_issues ci
    SET
      status = 'expired',
      expired_at = COALESCE(ci.expired_at, NOW()),
      metadata = COALESCE(ci.metadata, '{}'::jsonb) || jsonb_build_object(
        'expired_by', 'scheduled_coupon_expiry',
        'expired_job_version', '033_scheduled_coupon_expiry'
      )
    WHERE ci.status IN ('issued', 'opened', 'navigation_started')
      AND ci.expires_at <= NOW()
    RETURNING ci.id, ci.expired_at
  ),
  inserted_events AS (
    INSERT INTO public.coupon_events (coupon_id, event_type, actor_id, metadata, created_at)
    SELECT
      expired.id,
      'coupon_expired'::event_type,
      NULL,
      jsonb_build_object(
        'source', 'scheduled_coupon_expiry',
        'job_version', '033_scheduled_coupon_expiry'
      ),
      expired.expired_at
    FROM expired
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.coupon_events ce
      WHERE ce.coupon_id = expired.id
        AND ce.event_type = 'coupon_expired'
    )
    RETURNING id
  )
  SELECT expired_count
  INTO v_count
  FROM (
    SELECT COUNT(*) AS expired_count
    FROM expired
  ) expired_totals,
  (
    SELECT COUNT(*) AS inserted_event_count
    FROM inserted_events
  ) inserted_event_totals;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_old_coupons()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.expire_stale_coupons();
$$;

REVOKE ALL ON FUNCTION public.expire_stale_coupons() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_stale_coupons() FROM anon;
REVOKE ALL ON FUNCTION public.expire_stale_coupons() FROM authenticated;

REVOKE ALL ON FUNCTION public.expire_old_coupons() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_old_coupons() FROM anon;
REVOKE ALL ON FUNCTION public.expire_old_coupons() FROM authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'expire-stale-coupons-every-15-minutes'
  ) THEN
    PERFORM cron.unschedule('expire-stale-coupons-every-15-minutes');
  END IF;
END;
$$;

SELECT cron.schedule(
  'expire-stale-coupons-every-15-minutes',
  '*/15 * * * *',
  $$SELECT public.expire_stale_coupons();$$
);

COMMENT ON INDEX public.coupon_issues_active_expiry_idx
  IS 'Speeds scheduled expiry scans for active coupons past expires_at';

COMMENT ON FUNCTION public.expire_stale_coupons()
  IS 'System maintenance job that expires issued/opened/navigation_started coupons past expires_at and records one coupon_expired event';

COMMENT ON FUNCTION public.expire_old_coupons()
  IS 'Backward-compatible wrapper for expire_stale_coupons';

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

  PERFORM public.expire_stale_coupons();

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

COMMENT ON FUNCTION public.issue_coupon(UUID, UUID, UUID, UUID, DECIMAL, DOUBLE PRECISION, DOUBLE PRECISION)
  IS 'Issue or return one active coupon for the authenticated user, expiring stale coupons through the system expiry job first';

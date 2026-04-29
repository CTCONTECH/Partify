-- Client part discovery.
-- Stores each client's recent part selections and exposes aggregate popular parts.

CREATE TABLE IF NOT EXISTS client_part_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  query TEXT,
  activity_type TEXT NOT NULL DEFAULT 'part_viewed' CHECK (
    activity_type IN ('search_result_opened', 'part_viewed')
  ),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_part_activity_user_idx
  ON client_part_activity(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS client_part_activity_part_idx
  ON client_part_activity(part_id, created_at DESC);

ALTER TABLE client_part_activity ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON client_part_activity TO authenticated;

DROP POLICY IF EXISTS "Clients can view own part activity" ON client_part_activity;
CREATE POLICY "Clients can view own part activity"
  ON client_part_activity FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Clients can create own part activity" ON client_part_activity;
CREATE POLICY "Clients can create own part activity"
  ON client_part_activity FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION get_popular_parts(part_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  part_number TEXT,
  part_name TEXT,
  category TEXT,
  description TEXT,
  compatibility JSONB,
  supplier_count BIGINT,
  min_price NUMERIC,
  max_price NUMERIC,
  popularity_score BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH inventory_stats AS (
    SELECT
      part_id,
      COUNT(DISTINCT supplier_id) AS supplier_count,
      MIN(price) AS min_price,
      MAX(price) AS max_price
    FROM supplier_inventory
    WHERE stock > 0
    GROUP BY part_id
  ),
  coupon_stats AS (
    SELECT
      part_id,
      COUNT(*) AS coupon_count
    FROM coupon_issues
    GROUP BY part_id
  ),
  activity_stats AS (
    SELECT
      part_id,
      COUNT(*) AS activity_count
    FROM client_part_activity
    WHERE created_at >= NOW() - INTERVAL '90 days'
    GROUP BY part_id
  )
  SELECT
    p.id,
    p.part_number,
    p.part_name,
    p.category,
    p.description,
    p.compatibility,
    COALESCE(i.supplier_count, 0) AS supplier_count,
    COALESCE(i.min_price, 0) AS min_price,
    COALESCE(i.max_price, 0) AS max_price,
    (
      COALESCE(c.coupon_count, 0) * 5 +
      COALESCE(a.activity_count, 0) * 2 +
      COALESCE(i.supplier_count, 0)
    )::BIGINT AS popularity_score
  FROM parts p
  JOIN inventory_stats i ON i.part_id = p.id
  LEFT JOIN coupon_stats c ON c.part_id = p.id
  LEFT JOIN activity_stats a ON a.part_id = p.id
  ORDER BY popularity_score DESC, i.supplier_count DESC, p.part_name ASC
  LIMIT GREATEST(1, LEAST(part_limit, 50));
$$;

GRANT EXECUTE ON FUNCTION get_popular_parts(INTEGER) TO authenticated;

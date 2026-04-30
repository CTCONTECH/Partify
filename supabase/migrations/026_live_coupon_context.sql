-- Live coupon screen context.
-- Returns one supplier inventory row with supplier coordinates and part details.

CREATE OR REPLACE FUNCTION get_coupon_context(
  supplier_id_filter UUID,
  part_id_filter UUID
)
RETURNS TABLE (
  inventory_id UUID,
  supplier_id UUID,
  business_name TEXT,
  address TEXT,
  suburb TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  part_id UUID,
  part_number TEXT,
  part_name TEXT,
  price NUMERIC,
  stock INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    si.id AS inventory_id,
    s.id AS supplier_id,
    s.business_name,
    s.address,
    s.suburb,
    ST_Y(s.coordinates::geometry) AS latitude,
    ST_X(s.coordinates::geometry) AS longitude,
    p.id AS part_id,
    p.part_number,
    p.part_name,
    si.price,
    si.stock
  FROM supplier_inventory si
  JOIN suppliers s ON s.id = si.supplier_id
  JOIN parts p ON p.id = si.part_id
  WHERE si.supplier_id = supplier_id_filter
    AND si.part_id = part_id_filter
    AND si.stock > 0
    AND s.active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_coupon_context(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION get_coupon_context IS 'Returns live supplier, part, inventory, and coordinates for coupon issuing';

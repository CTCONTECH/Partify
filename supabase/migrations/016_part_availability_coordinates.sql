-- Include supplier coordinates in part availability results.
-- Needed by the client for map/navigation and coupon journeys.

CREATE OR REPLACE FUNCTION get_part_availability(
  part_id_filter UUID,
  user_lat DOUBLE PRECISION DEFAULT NULL,
  user_lon DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE (
  inventory_id UUID,
  part_id UUID,
  part_number TEXT,
  part_name TEXT,
  supplier_id UUID,
  business_name TEXT,
  address TEXT,
  suburb TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  price DECIMAL,
  stock INTEGER,
  distance_km DOUBLE PRECISION,
  fuel_cost DECIMAL,
  total_cost DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.id as inventory_id,
    p.id as part_id,
    COALESCE(si.supplier_part_number, p.part_number) as part_number,
    p.part_name,
    s.id as supplier_id,
    s.business_name,
    s.address,
    s.suburb,
    ST_Y(s.coordinates::geometry) as latitude,
    ST_X(s.coordinates::geometry) as longitude,
    si.price,
    si.stock,
    CASE
      WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL THEN
        ST_Distance(
          s.coordinates,
          ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
        ) / 1000
      ELSE
        NULL
    END as distance_km,
    CASE
      WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL THEN
        ROUND((ST_Distance(
          s.coordinates,
          ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
        ) / 1000 * 2.5 * 2)::numeric, 2)
      ELSE
        0
    END as fuel_cost,
    CASE
      WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL THEN
        si.price + ROUND((ST_Distance(
          s.coordinates,
          ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
        ) / 1000 * 2.5 * 2)::numeric, 2)
      ELSE
        si.price
    END as total_cost
  FROM supplier_inventory si
  JOIN parts p ON p.id = si.part_id
  JOIN suppliers s ON s.id = si.supplier_id
  WHERE si.part_id = part_id_filter
    AND si.stock > 0
    AND s.active = true
  ORDER BY total_cost ASC;
END;
$$ LANGUAGE plpgsql STABLE;

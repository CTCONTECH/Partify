-- Production fuel cost model.
-- Uses monthly South African fuel prices and vehicle fuel profiles instead of a fixed per-km estimate.

CREATE TABLE IF NOT EXISTS fuel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'ZA',
  region TEXT NOT NULL CHECK (region IN ('coastal', 'inland')),
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('petrol', 'diesel')),
  fuel_grade TEXT NOT NULL,
  price_per_litre NUMERIC(10, 2) NOT NULL CHECK (price_per_litre > 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  source TEXT NOT NULL DEFAULT 'dmre',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(country_code, region, fuel_type, fuel_grade, effective_from)
);

CREATE INDEX IF NOT EXISTS fuel_prices_current_idx
  ON fuel_prices(country_code, region, fuel_type, fuel_grade, effective_from DESC);

CREATE TRIGGER update_fuel_prices_updated_at
  BEFORE UPDATE ON fuel_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view fuel prices" ON fuel_prices;
CREATE POLICY "Anyone can view fuel prices"
  ON fuel_prices FOR SELECT
  USING (true);

GRANT SELECT ON fuel_prices TO anon, authenticated;

ALTER TABLE vehicle_catalog
  ADD COLUMN IF NOT EXISTS fuel_grade TEXT,
  ADD COLUMN IF NOT EXISTS consumption_l_per_100km NUMERIC(5, 2);

UPDATE vehicle_catalog
SET fuel_type = 'Petrol',
    fuel_grade = '93',
    consumption_l_per_100km = 6.6
WHERE make = 'Toyota' AND model = 'Corolla' AND year = 2018 AND engine = '1.6 Petrol';

UPDATE vehicle_catalog
SET fuel_type = 'Petrol',
    fuel_grade = '95',
    consumption_l_per_100km = 5.2
WHERE make = 'VW' AND model = 'Polo' AND year = 2019 AND engine = '1.4 TSI';

UPDATE vehicle_catalog
SET fuel_type = 'Petrol',
    fuel_grade = '95',
    consumption_l_per_100km = 6.4
WHERE make = 'Honda' AND model = 'Civic' AND year = 2017 AND engine = '1.8 VTEC';

UPDATE vehicle_catalog
SET fuel_type = 'Petrol',
    fuel_grade = '95',
    consumption_l_per_100km = 5.4
WHERE make = 'Ford' AND model = 'Fiesta' AND year = 2016 AND engine = '1.0 EcoBoost';

UPDATE vehicle_catalog
SET fuel_type = 'Petrol',
    fuel_grade = '95',
    consumption_l_per_100km = 6.0
WHERE make = 'BMW' AND model = '320i' AND year = 2015 AND engine = '2.0 Turbo';

INSERT INTO fuel_prices (
  country_code,
  region,
  fuel_type,
  fuel_grade,
  price_per_litre,
  effective_from,
  source
)
VALUES
  ('ZA', 'coastal', 'petrol', '93', 22.46, '2026-04-01', 'dmre_april_2026'),
  ('ZA', 'coastal', 'petrol', '95', 22.53, '2026-04-01', 'dmre_april_2026'),
  ('ZA', 'coastal', 'diesel', '0.05', 25.07, '2026-04-01', 'dmre_april_2026'),
  ('ZA', 'coastal', 'diesel', '0.005', 25.35, '2026-04-01', 'dmre_april_2026'),
  ('ZA', 'inland', 'petrol', '93', 23.25, '2026-04-01', 'dmre_april_2026'),
  ('ZA', 'inland', 'petrol', '95', 23.36, '2026-04-01', 'dmre_april_2026'),
  ('ZA', 'inland', 'diesel', '0.05', 25.90, '2026-04-01', 'dmre_april_2026'),
  ('ZA', 'inland', 'diesel', '0.005', 26.11, '2026-04-01', 'dmre_april_2026')
ON CONFLICT (country_code, region, fuel_type, fuel_grade, effective_from) DO UPDATE
SET price_per_litre = EXCLUDED.price_per_litre,
    source = EXCLUDED.source;

CREATE OR REPLACE FUNCTION get_vehicle_fuel_profile(
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_engine TEXT,
  fuel_region TEXT DEFAULT 'coastal'
)
RETURNS TABLE (
  fuel_type TEXT,
  fuel_grade TEXT,
  consumption_l_per_100km NUMERIC,
  price_per_litre NUMERIC,
  region TEXT,
  price_effective_from DATE,
  source TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH profile AS (
    SELECT
      lower(coalesce(vc.fuel_type, 'Petrol')) AS fuel_type,
      coalesce(vc.fuel_grade, '95') AS fuel_grade,
      coalesce(vc.consumption_l_per_100km, 8.0) AS consumption_l_per_100km
    FROM vehicle_catalog vc
    WHERE lower(vc.make) = lower(vehicle_make)
      AND lower(vc.model) = lower(vehicle_model)
      AND vc.year = vehicle_year
      AND lower(vc.engine) = lower(vehicle_engine)
    LIMIT 1
  ),
  fallback_profile AS (
    SELECT 'petrol'::TEXT AS fuel_type, '95'::TEXT AS fuel_grade, 8.0::NUMERIC AS consumption_l_per_100km
  ),
  selected_profile AS (
    SELECT * FROM profile
    UNION ALL
    SELECT * FROM fallback_profile
    WHERE NOT EXISTS (SELECT 1 FROM profile)
    LIMIT 1
  )
  SELECT
    sp.fuel_type,
    sp.fuel_grade,
    sp.consumption_l_per_100km,
    fp.price_per_litre,
    fp.region,
    fp.effective_from,
    fp.source
  FROM selected_profile sp
  JOIN LATERAL (
    SELECT *
    FROM fuel_prices fp
    WHERE fp.country_code = 'ZA'
      AND fp.region = fuel_region
      AND fp.fuel_type = sp.fuel_type
      AND fp.fuel_grade = sp.fuel_grade
      AND fp.effective_from <= CURRENT_DATE
      AND (fp.effective_to IS NULL OR fp.effective_to >= CURRENT_DATE)
    ORDER BY fp.effective_from DESC
    LIMIT 1
  ) fp ON true;
$$;

GRANT EXECUTE ON FUNCTION get_vehicle_fuel_profile(TEXT, TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS get_part_availability(UUID);
DROP FUNCTION IF EXISTS get_part_availability(UUID, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS get_part_availability(UUID, DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, NUMERIC, BOOLEAN);

CREATE OR REPLACE FUNCTION get_part_availability(
  part_id_filter UUID,
  user_lat DOUBLE PRECISION DEFAULT NULL,
  user_lon DOUBLE PRECISION DEFAULT NULL,
  fuel_price_per_litre NUMERIC DEFAULT 22.53,
  consumption_l_per_100km NUMERIC DEFAULT 8.0,
  round_trip BOOLEAN DEFAULT true
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
    p.part_number,
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
        ROUND((
          (ST_Distance(
            s.coordinates,
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
          ) / 1000)
          * CASE WHEN round_trip THEN 2 ELSE 1 END
          * (consumption_l_per_100km / 100)
          * fuel_price_per_litre
        )::numeric, 2)
      ELSE
        0
    END as fuel_cost,
    CASE
      WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL THEN
        si.price + ROUND((
          (ST_Distance(
            s.coordinates,
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
          ) / 1000)
          * CASE WHEN round_trip THEN 2 ELSE 1 END
          * (consumption_l_per_100km / 100)
          * fuel_price_per_litre
        )::numeric, 2)
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

COMMENT ON TABLE fuel_prices IS 'Monthly South African fuel prices used for trip-cost estimates';
COMMENT ON FUNCTION get_vehicle_fuel_profile IS 'Returns estimated vehicle consumption and current fuel price';
COMMENT ON FUNCTION get_part_availability IS 'Get part availability with vehicle-aware fuel cost and distance calculation';

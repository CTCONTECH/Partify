-- Internal vehicle fitment model.
-- This is Partify's source-of-truth shape for compatibility. External catalogues
-- such as TecDoc can be imported into these tables later.

CREATE TABLE IF NOT EXISTS vehicle_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  model_family TEXT,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
  engine TEXT NOT NULL,
  fuel_type TEXT,
  body_type TEXT,
  source TEXT NOT NULL DEFAULT 'partify',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(make, model, year, engine)
);

CREATE INDEX IF NOT EXISTS vehicle_catalog_lookup_idx
  ON vehicle_catalog(make, model, year, engine);

CREATE INDEX IF NOT EXISTS vehicle_catalog_family_idx
  ON vehicle_catalog(make, model_family, year)
  WHERE model_family IS NOT NULL;

CREATE TRIGGER update_vehicle_catalog_updated_at
  BEFORE UPDATE ON vehicle_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE vehicle_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view vehicle catalog" ON vehicle_catalog;
CREATE POLICY "Anyone can view vehicle catalog"
  ON vehicle_catalog FOR SELECT
  USING (true);

GRANT SELECT ON vehicle_catalog TO anon, authenticated;

CREATE TABLE IF NOT EXISTS part_vehicle_fitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT,
  model_family TEXT,
  year_start INTEGER NOT NULL CHECK (year_start >= 1900 AND year_start <= 2100),
  year_end INTEGER NOT NULL CHECK (year_end >= year_start AND year_end <= 2100),
  engine TEXT,
  fuel_type TEXT,
  body_type TEXT,
  fitment_notes TEXT,
  source TEXT NOT NULL DEFAULT 'partify',
  confidence INTEGER NOT NULL DEFAULT 80 CHECK (confidence >= 0 AND confidence <= 100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS part_vehicle_fitments_unique_idx
  ON part_vehicle_fitments(
    part_id,
    lower(make),
    lower(coalesce(model, '')),
    lower(coalesce(model_family, '')),
    year_start,
    year_end,
    lower(coalesce(engine, '')),
    lower(coalesce(fuel_type, '')),
    lower(coalesce(body_type, ''))
  );

CREATE INDEX IF NOT EXISTS part_vehicle_fitments_lookup_idx
  ON part_vehicle_fitments(make, year_start, year_end, active);

CREATE INDEX IF NOT EXISTS part_vehicle_fitments_part_idx
  ON part_vehicle_fitments(part_id);

CREATE TRIGGER update_part_vehicle_fitments_updated_at
  BEFORE UPDATE ON part_vehicle_fitments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE part_vehicle_fitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active part fitments" ON part_vehicle_fitments;
CREATE POLICY "Anyone can view active part fitments"
  ON part_vehicle_fitments FOR SELECT
  USING (active = true);

GRANT SELECT ON part_vehicle_fitments TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_compatible_parts(
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_engine TEXT,
  search_query TEXT DEFAULT '',
  result_limit INTEGER DEFAULT 100
)
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
  latest_inventory_at TIMESTAMP WITH TIME ZONE,
  fitment_confidence INTEGER,
  fitment_source TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH selected_vehicle AS (
    SELECT
      vehicle_make AS make,
      vehicle_model AS model,
      vehicle_year AS year,
      vehicle_engine AS engine,
      (
        SELECT vc.model_family
        FROM vehicle_catalog vc
        WHERE lower(vc.make) = lower(vehicle_make)
          AND lower(vc.model) = lower(vehicle_model)
          AND vc.year = vehicle_year
          AND lower(vc.engine) = lower(vehicle_engine)
        LIMIT 1
      ) AS model_family
  ),
  inventory_stats AS (
    SELECT
      part_id,
      COUNT(DISTINCT supplier_id) AS supplier_count,
      MIN(price) AS min_price,
      MAX(price) AS max_price,
      MAX(updated_at) AS latest_inventory_at
    FROM supplier_inventory
    WHERE stock > 0
    GROUP BY part_id
  ),
  matched_fitments AS (
    SELECT DISTINCT ON (f.part_id)
      f.part_id,
      f.confidence,
      f.source
    FROM part_vehicle_fitments f
    CROSS JOIN selected_vehicle v
    WHERE f.active = true
      AND lower(f.make) = lower(v.make)
      AND v.year BETWEEN f.year_start AND f.year_end
      AND (
        f.model IS NULL
        OR lower(f.model) = lower(v.model)
        OR lower(f.model_family) = lower(v.model)
        OR (
          v.model_family IS NOT NULL
          AND lower(f.model_family) = lower(v.model_family)
        )
      )
      AND (
        f.engine IS NULL
        OR lower(f.engine) = lower(v.engine)
      )
    ORDER BY f.part_id, f.confidence DESC, f.updated_at DESC
  )
  SELECT
    p.id,
    p.part_number,
    p.part_name,
    p.category,
    p.description,
    p.compatibility,
    i.supplier_count,
    i.min_price,
    i.max_price,
    i.latest_inventory_at,
    m.confidence AS fitment_confidence,
    m.source AS fitment_source
  FROM matched_fitments m
  JOIN parts p ON p.id = m.part_id
  JOIN inventory_stats i ON i.part_id = p.id
  WHERE trim(coalesce(search_query, '')) = ''
     OR p.part_name ILIKE '%' || search_query || '%'
     OR p.part_number ILIKE '%' || search_query || '%'
     OR p.category ILIKE '%' || search_query || '%'
  ORDER BY m.confidence DESC, p.part_name ASC
  LIMIT GREATEST(1, LEAST(result_limit, 100));
$$;

GRANT EXECUTE ON FUNCTION get_compatible_parts(TEXT, TEXT, INTEGER, TEXT, TEXT, INTEGER) TO anon, authenticated;

INSERT INTO vehicle_catalog (make, model, model_family, year, engine, fuel_type, source)
VALUES
  ('Toyota', 'Corolla', 'Corolla', 2018, '1.6 Petrol', 'Petrol', 'partify_seed'),
  ('VW', 'Polo', 'Polo', 2019, '1.4 TSI', 'Petrol', 'partify_seed'),
  ('Honda', 'Civic', 'Civic', 2017, '1.8 VTEC', 'Petrol', 'partify_seed'),
  ('Ford', 'Fiesta', 'Fiesta', 2016, '1.0 EcoBoost', 'Petrol', 'partify_seed'),
  ('BMW', '320i', '3 Series', 2015, '2.0 Turbo', 'Petrol', 'partify_seed')
ON CONFLICT (make, model, year, engine) DO UPDATE
SET model_family = EXCLUDED.model_family,
    fuel_type = EXCLUDED.fuel_type,
    source = EXCLUDED.source;

INSERT INTO part_vehicle_fitments (
  part_id,
  make,
  model,
  model_family,
  year_start,
  year_end,
  engine,
  source,
  confidence
)
SELECT id, 'Toyota', 'Corolla', 'Corolla', 2015, 2020, NULL, 'partify_seed', 80
FROM parts WHERE part_number = 'BP-4567'
ON CONFLICT DO NOTHING;

INSERT INTO part_vehicle_fitments (
  part_id,
  make,
  model,
  model_family,
  year_start,
  year_end,
  engine,
  source,
  confidence
)
SELECT id, 'Toyota', 'Corolla Quest', 'Corolla', 2017, 2021, NULL, 'partify_seed', 80
FROM parts WHERE part_number = 'BP-4567'
ON CONFLICT DO NOTHING;

INSERT INTO part_vehicle_fitments (
  part_id,
  make,
  model,
  model_family,
  year_start,
  year_end,
  engine,
  source,
  confidence
)
SELECT id, 'VW', 'Golf', 'Golf', 2012, 2018, NULL, 'partify_seed', 80
FROM parts WHERE part_number = 'OF-8921'
ON CONFLICT DO NOTHING;

INSERT INTO part_vehicle_fitments (
  part_id,
  make,
  model,
  model_family,
  year_start,
  year_end,
  engine,
  source,
  confidence
)
SELECT id, 'VW', 'Polo', 'Polo', 2014, 2019, NULL, 'partify_seed', 80
FROM parts WHERE part_number = 'OF-8921'
ON CONFLICT DO NOTHING;

INSERT INTO part_vehicle_fitments (
  part_id,
  make,
  model,
  model_family,
  year_start,
  year_end,
  engine,
  source,
  confidence
)
SELECT id, 'Honda', 'Civic', 'Civic', 2016, 2021, NULL, 'partify_seed', 80
FROM parts WHERE part_number = 'SP-1234'
ON CONFLICT DO NOTHING;

INSERT INTO part_vehicle_fitments (
  part_id,
  make,
  model,
  model_family,
  year_start,
  year_end,
  engine,
  source,
  confidence
)
SELECT id, 'Honda', 'Jazz', 'Jazz', 2015, 2020, NULL, 'partify_seed', 80
FROM parts WHERE part_number = 'SP-1234'
ON CONFLICT DO NOTHING;

INSERT INTO part_vehicle_fitments (
  part_id,
  make,
  model,
  model_family,
  year_start,
  year_end,
  engine,
  source,
  confidence
)
SELECT id, 'Ford', 'Focus', 'Focus', 2014, 2019, NULL, 'partify_seed', 80
FROM parts WHERE part_number = 'AF-5678'
ON CONFLICT DO NOTHING;

INSERT INTO part_vehicle_fitments (
  part_id,
  make,
  model,
  model_family,
  year_start,
  year_end,
  engine,
  source,
  confidence
)
SELECT id, 'Ford', 'Fiesta', 'Fiesta', 2013, 2018, NULL, 'partify_seed', 80
FROM parts WHERE part_number = 'AF-5678'
ON CONFLICT DO NOTHING;

INSERT INTO part_vehicle_fitments (
  part_id,
  make,
  model,
  model_family,
  year_start,
  year_end,
  engine,
  source,
  confidence
)
SELECT id, 'BMW', NULL, '3 Series', 2010, 2015, NULL, 'partify_seed', 80
FROM parts WHERE part_number = 'WP-9012'
ON CONFLICT DO NOTHING;

INSERT INTO part_vehicle_fitments (
  part_id,
  make,
  model,
  model_family,
  year_start,
  year_end,
  engine,
  source,
  confidence
)
SELECT id, 'BMW', NULL, '1 Series', 2012, 2016, NULL, 'partify_seed', 80
FROM parts WHERE part_number = 'WP-9012'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE vehicle_catalog IS 'Structured vehicle catalogue used for fitment matching';
COMMENT ON TABLE part_vehicle_fitments IS 'Canonical part-to-vehicle compatibility rules';
COMMENT ON FUNCTION get_compatible_parts IS 'Returns in-stock parts compatible with a saved vehicle';

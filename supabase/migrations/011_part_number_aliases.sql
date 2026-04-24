-- Supplier-specific Part Number Alias Mapping
-- Allows multiple supplier numbers to map to one canonical part

CREATE TABLE part_number_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  alias_part_number TEXT NOT NULL,
  alias_part_number_normalized TEXT GENERATED ALWAYS AS (
    regexp_replace(upper(alias_part_number), '[^A-Z0-9]', '', 'g')
  ) STORED,
  source_type TEXT NOT NULL DEFAULT 'supplier'
    CHECK (source_type IN ('canonical', 'oem', 'aftermarket', 'supplier')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(part_id, supplier_id, alias_part_number_normalized)
);

CREATE INDEX part_number_aliases_number_idx ON part_number_aliases(alias_part_number_normalized);
CREATE INDEX part_number_aliases_part_idx ON part_number_aliases(part_id);
CREATE INDEX part_number_aliases_supplier_idx ON part_number_aliases(supplier_id);

CREATE TRIGGER update_part_number_aliases_updated_at
  BEFORE UPDATE ON part_number_aliases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE part_number_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view part number aliases"
  ON part_number_aliases FOR SELECT
  USING (true);

CREATE POLICY "Suppliers can manage own aliases"
  ON part_number_aliases FOR ALL
  USING (supplier_id = auth.uid())
  WITH CHECK (supplier_id = auth.uid());

-- Store supplier-specific display numbers directly on inventory rows.
ALTER TABLE supplier_inventory
  ADD COLUMN supplier_part_number TEXT,
  ADD COLUMN supplier_part_number_normalized TEXT GENERATED ALWAYS AS (
    CASE
      WHEN supplier_part_number IS NULL THEN NULL
      ELSE regexp_replace(upper(supplier_part_number), '[^A-Z0-9]', '', 'g')
    END
  ) STORED;

CREATE INDEX supplier_inventory_supplier_part_number_idx
  ON supplier_inventory(supplier_part_number_normalized)
  WHERE supplier_part_number IS NOT NULL;

-- Backfill supplier display numbers from canonical number for current inventory.
UPDATE supplier_inventory si
SET supplier_part_number = p.part_number
FROM parts p
WHERE p.id = si.part_id
  AND si.supplier_part_number IS NULL;

-- Seed canonical aliases from existing canonical part numbers.
INSERT INTO part_number_aliases (part_id, supplier_id, alias_part_number, source_type, is_primary)
SELECT p.id, NULL, p.part_number, 'canonical', true
FROM parts p
ON CONFLICT (part_id, supplier_id, alias_part_number_normalized) DO NOTHING;

-- Seed supplier-specific aliases from inventory numbers.
INSERT INTO part_number_aliases (part_id, supplier_id, alias_part_number, source_type, is_primary)
SELECT si.part_id, si.supplier_id, si.supplier_part_number, 'supplier', false
FROM supplier_inventory si
WHERE si.supplier_part_number IS NOT NULL
ON CONFLICT (part_id, supplier_id, alias_part_number_normalized) DO NOTHING;

-- Return supplier-specific number when available, fallback to canonical number.
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

COMMENT ON TABLE part_number_aliases IS 'Maps supplier/OEM/aftermarket numbers to canonical parts';
COMMENT ON COLUMN supplier_inventory.supplier_part_number IS 'Supplier-native catalog number shown to users';

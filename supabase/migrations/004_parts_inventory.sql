-- Parts Catalog and Inventory Tables

-- Parts catalog
CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number TEXT UNIQUE NOT NULL,
  part_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  compatibility JSONB, -- Array of compatible vehicles
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX parts_part_number_idx ON parts(part_number);
CREATE INDEX parts_category_idx ON parts(category);
CREATE INDEX parts_part_name_idx ON parts USING GIN(to_tsvector('english', part_name));

-- Updated timestamp trigger
CREATE TRIGGER update_parts_updated_at
  BEFORE UPDATE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

-- Supplier inventory
CREATE TABLE supplier_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold INTEGER DEFAULT 5 CHECK (low_stock_threshold >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, part_id)
);

-- Indexes
CREATE INDEX supplier_inventory_supplier_idx ON supplier_inventory(supplier_id);
CREATE INDEX supplier_inventory_part_idx ON supplier_inventory(part_id);
CREATE INDEX supplier_inventory_stock_idx ON supplier_inventory(stock) WHERE stock > 0;
CREATE INDEX supplier_inventory_low_stock_idx ON supplier_inventory(stock)
  WHERE stock > 0 AND stock <= low_stock_threshold;

-- Updated timestamp trigger
CREATE TRIGGER update_supplier_inventory_updated_at
  BEFORE UPDATE ON supplier_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE supplier_inventory ENABLE ROW LEVEL SECURITY;

-- Function to get part availability across suppliers
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
    p.part_number,
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

COMMENT ON TABLE parts IS 'Car parts catalog';
COMMENT ON TABLE supplier_inventory IS 'Supplier stock and pricing for each part';
COMMENT ON FUNCTION get_part_availability IS 'Get part availability with pricing and distance calculation';

-- Suppliers Table
-- Stores supplier business information and geospatial data

CREATE TABLE suppliers (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  address TEXT NOT NULL,
  suburb TEXT NOT NULL,
  coordinates GEOGRAPHY(POINT, 4326) NOT NULL, -- PostGIS point (lat, lon)
  rating DECIMAL(2,1) DEFAULT 4.0 CHECK (rating >= 0 AND rating <= 5),
  total_parts INTEGER DEFAULT 0 CHECK (total_parts >= 0),
  commission_rate DECIMAL(5,2) DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  discount_percent DECIMAL(5,2) DEFAULT 5.00 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spatial index for fast nearest-supplier queries
CREATE INDEX suppliers_coordinates_gist_idx ON suppliers USING GIST(coordinates);

-- Other indexes
CREATE INDEX suppliers_active_idx ON suppliers(active) WHERE active = true;
CREATE INDEX suppliers_suburb_idx ON suppliers(suburb);

-- Updated timestamp trigger
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS will be added in later migration
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Helper function to find nearest suppliers
CREATE OR REPLACE FUNCTION find_nearest_suppliers(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  part_id_filter UUID DEFAULT NULL,
  max_distance_km INTEGER DEFAULT 50,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  supplier_id UUID,
  business_name TEXT,
  address TEXT,
  suburb TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  rating DECIMAL,
  commission_rate DECIMAL,
  discount_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.business_name,
    s.address,
    s.suburb,
    ST_Y(s.coordinates::geometry) as latitude,
    ST_X(s.coordinates::geometry) as longitude,
    ST_Distance(
      s.coordinates,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
    ) / 1000 as distance_km,
    s.rating,
    s.commission_rate,
    s.discount_percent
  FROM suppliers s
  WHERE s.active = true
    AND ST_DWithin(
      s.coordinates,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
      max_distance_km * 1000
    )
    AND (part_id_filter IS NULL OR EXISTS (
      SELECT 1 FROM supplier_inventory si
      WHERE si.supplier_id = s.id
        AND si.part_id = part_id_filter
        AND si.stock > 0
    ))
  ORDER BY distance_km ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE suppliers IS 'Supplier business details with geospatial coordinates';
COMMENT ON FUNCTION find_nearest_suppliers IS 'Find nearest suppliers within radius, optionally filtered by part availability';

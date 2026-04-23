-- Seed Data for Cape Town Suppliers and Parts
-- Run after schema and RLS setup

-- Note: In production, you'll create real user accounts via Supabase Auth
-- This creates placeholder supplier records for development

-- Insert Cape Town suppliers
-- IMPORTANT: Replace these UUIDs with real auth.users IDs in production
DO $$
DECLARE
  supplier1_id UUID := '00000000-0000-0000-0000-000000000001';
  supplier2_id UUID := '00000000-0000-0000-0000-000000000002';
  supplier3_id UUID := '00000000-0000-0000-0000-000000000003';
  supplier4_id UUID := '00000000-0000-0000-0000-000000000004';
  supplier5_id UUID := '00000000-0000-0000-0000-000000000005';
BEGIN
  -- Insert supplier profiles (in production, these come from auth.users)
  -- For dev/testing only:
  INSERT INTO profiles (id, email, role, name, phone) VALUES
    (supplier1_id, 'autozone@partify.test', 'supplier', 'AutoZone Manager', '+27 21 555 0001'),
    (supplier2_id, 'midas@partify.test', 'supplier', 'Midas Manager', '+27 21 555 0002'),
    (supplier3_id, 'capeauto@partify.test', 'supplier', 'Cape Auto Manager', '+27 21 555 0003'),
    (supplier4_id, 'motorcity@partify.test', 'supplier', 'Motor City Manager', '+27 21 555 0004'),
    (supplier5_id, 'proauto@partify.test', 'supplier', 'ProAuto Manager', '+27 21 555 0005')
  ON CONFLICT (id) DO NOTHING;

  -- Insert suppliers with real Cape Town coordinates
  INSERT INTO suppliers (id, business_name, address, suburb, coordinates, rating, commission_rate, discount_percent) VALUES
    (
      supplier1_id,
      'AutoZone Cape Town',
      '12 Voortrekker Road, Bellville, Cape Town, 7530',
      'Bellville',
      ST_SetSRID(ST_MakePoint(18.6289, -33.8989), 4326)::geography,
      4.5,
      10.00,
      5.00
    ),
    (
      supplier2_id,
      'Midas Auto Parts',
      '45 Oude Molen Road, Parow, Cape Town, 7500',
      'Parow',
      ST_SetSRID(ST_MakePoint(18.5850, -33.8950), 4326)::geography,
      4.7,
      10.00,
      5.00
    ),
    (
      supplier3_id,
      'Cape Auto Spares',
      '78 Victoria Road, Woodstock, Cape Town, 7925',
      'Woodstock',
      ST_SetSRID(ST_MakePoint(18.4472, -33.9307), 4326)::geography,
      4.2,
      10.00,
      5.00
    ),
    (
      supplier4_id,
      'Motor City Parts',
      '156 Koeberg Road, Milnerton, Cape Town, 7441',
      'Milnerton',
      ST_SetSRID(ST_MakePoint(18.5011, -33.8769), 4326)::geography,
      4.6,
      10.00,
      5.00
    ),
    (
      supplier5_id,
      'ProAuto Supply',
      '23 Old Paarl Road, Brackenfell, Cape Town, 7560',
      'Brackenfell',
      ST_SetSRID(ST_MakePoint(18.6892, -33.8678), 4326)::geography,
      4.8,
      10.00,
      5.00
    )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Insert common car parts
INSERT INTO parts (part_number, part_name, category, description, compatibility) VALUES
  (
    'BP-4567',
    'Front Brake Pads',
    'Brakes',
    'High-performance ceramic brake pads',
    '["Toyota Corolla 2015-2020", "Toyota Corolla Quest 2017-2021"]'::jsonb
  ),
  (
    'OF-8921',
    'Oil Filter',
    'Engine',
    'OEM quality oil filter',
    '["VW Golf 2012-2018", "VW Polo 2014-2019"]'::jsonb
  ),
  (
    'SP-1234',
    'Spark Plugs (Set of 4)',
    'Engine',
    'Iridium spark plugs for better performance',
    '["Honda Civic 2016-2021", "Honda Jazz 2015-2020"]'::jsonb
  ),
  (
    'AF-5678',
    'Air Filter',
    'Engine',
    'High-flow air filter',
    '["Ford Focus 2014-2019", "Ford Fiesta 2013-2018"]'::jsonb
  ),
  (
    'WP-9012',
    'Water Pump',
    'Cooling',
    'Complete water pump assembly',
    '["BMW 3 Series 2010-2015", "BMW 1 Series 2012-2016"]'::jsonb
  )
ON CONFLICT (part_number) DO NOTHING;

-- Insert inventory for suppliers
DO $$
DECLARE
  supplier1_id UUID := '00000000-0000-0000-0000-000000000001';
  supplier2_id UUID := '00000000-0000-0000-0000-000000000002';
  supplier3_id UUID := '00000000-0000-0000-0000-000000000003';
  supplier4_id UUID := '00000000-0000-0000-0000-000000000004';
  supplier5_id UUID := '00000000-0000-0000-0000-000000000005';

  part1_id UUID;
  part2_id UUID;
  part3_id UUID;
  part4_id UUID;
  part5_id UUID;
BEGIN
  -- Get part IDs
  SELECT id INTO part1_id FROM parts WHERE part_number = 'BP-4567';
  SELECT id INTO part2_id FROM parts WHERE part_number = 'OF-8921';
  SELECT id INTO part3_id FROM parts WHERE part_number = 'SP-1234';
  SELECT id INTO part4_id FROM parts WHERE part_number = 'AF-5678';
  SELECT id INTO part5_id FROM parts WHERE part_number = 'WP-9012';

  -- Front Brake Pads inventory
  INSERT INTO supplier_inventory (supplier_id, part_id, price, stock) VALUES
    (supplier1_id, part1_id, 450.00, 8),
    (supplier2_id, part1_id, 425.00, 3),
    (supplier3_id, part1_id, 480.00, 12),
    (supplier5_id, part1_id, 440.00, 6)
  ON CONFLICT (supplier_id, part_id) DO NOTHING;

  -- Oil Filter inventory
  INSERT INTO supplier_inventory (supplier_id, part_id, price, stock) VALUES
    (supplier1_id, part2_id, 85.00, 15),
    (supplier2_id, part2_id, 80.00, 22),
    (supplier4_id, part2_id, 90.00, 8)
  ON CONFLICT (supplier_id, part_id) DO NOTHING;

  -- Spark Plugs inventory
  INSERT INTO supplier_inventory (supplier_id, part_id, price, stock) VALUES
    (supplier1_id, part3_id, 280.00, 12),
    (supplier3_id, part3_id, 275.00, 2),
    (supplier5_id, part3_id, 290.00, 18)
  ON CONFLICT (supplier_id, part_id) DO NOTHING;

  -- Air Filter inventory
  INSERT INTO supplier_inventory (supplier_id, part_id, price, stock) VALUES
    (supplier2_id, part4_id, 120.00, 25),
    (supplier4_id, part4_id, 115.00, 10),
    (supplier5_id, part4_id, 125.00, 14)
  ON CONFLICT (supplier_id, part_id) DO NOTHING;

  -- Water Pump inventory
  INSERT INTO supplier_inventory (supplier_id, part_id, price, stock) VALUES
    (supplier1_id, part5_id, 1250.00, 4),
    (supplier2_id, part5_id, 1200.00, 6),
    (supplier3_id, part5_id, 1280.00, 3)
  ON CONFLICT (supplier_id, part_id) DO NOTHING;

  -- Update supplier total_parts counts
  UPDATE suppliers SET total_parts = (
    SELECT COUNT(*) FROM supplier_inventory WHERE supplier_id = suppliers.id
  );
END $$;

-- Create indexes on JSONB compatibility field
CREATE INDEX IF NOT EXISTS parts_compatibility_gin_idx ON parts USING GIN (compatibility);

COMMENT ON SCHEMA public IS 'Partify database schema with Cape Town suppliers seed data';

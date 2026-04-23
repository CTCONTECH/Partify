-- Coupon System Tables

CREATE TABLE coupon_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  part_id UUID REFERENCES parts(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES supplier_inventory(id) ON DELETE SET NULL,

  -- Pricing snapshot at time of issue
  original_price DECIMAL(10,2) NOT NULL CHECK (original_price >= 0),
  discount_percent DECIMAL(5,2) NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_amount DECIMAL(10,2) NOT NULL CHECK (discount_amount >= 0),
  final_price DECIMAL(10,2) NOT NULL CHECK (final_price >= 0),

  -- Status and lifecycle
  status coupon_status NOT NULL DEFAULT 'issued',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Event timestamps
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  navigation_started_at TIMESTAMP WITH TIME ZONE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Redemption details
  redeemed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actual_order_amount DECIMAL(10,2),

  -- Metadata
  user_location GEOGRAPHY(POINT, 4326), -- User location when coupon issued
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CHECK (final_price = original_price - discount_amount),
  CHECK (expires_at > issued_at),
  CHECK (
    (status != 'redeemed' AND redeemed_at IS NULL AND redeemed_by IS NULL) OR
    (status = 'redeemed' AND redeemed_at IS NOT NULL AND redeemed_by IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX coupon_issues_user_idx ON coupon_issues(user_id);
CREATE INDEX coupon_issues_supplier_idx ON coupon_issues(supplier_id);
CREATE INDEX coupon_issues_status_idx ON coupon_issues(status);
CREATE INDEX coupon_issues_code_idx ON coupon_issues(code);
CREATE INDEX coupon_issues_expires_idx ON coupon_issues(expires_at);
CREATE INDEX coupon_issues_issued_at_idx ON coupon_issues(issued_at DESC);
CREATE INDEX coupon_issues_redeemed_idx ON coupon_issues(redeemed_at DESC)
  WHERE status = 'redeemed';

-- Updated timestamp trigger
CREATE TRIGGER update_coupon_issues_updated_at
  BEFORE UPDATE ON coupon_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique coupon code
CREATE OR REPLACE FUNCTION generate_coupon_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'PFY-';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to issue a new coupon
CREATE OR REPLACE FUNCTION issue_coupon(
  p_user_id UUID,
  p_supplier_id UUID,
  p_part_id UUID,
  p_inventory_id UUID,
  p_price DECIMAL,
  p_user_lat DOUBLE PRECISION DEFAULT NULL,
  p_user_lon DOUBLE PRECISION DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_code TEXT;
  v_discount_percent DECIMAL;
  v_discount_amount DECIMAL;
  v_final_price DECIMAL;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_coupon_id UUID;
  v_user_location GEOGRAPHY;
BEGIN
  -- Get supplier discount rate
  SELECT discount_percent INTO v_discount_percent
  FROM suppliers
  WHERE id = p_supplier_id;

  -- Calculate discount
  v_discount_amount := ROUND((p_price * v_discount_percent / 100)::numeric, 2);
  v_final_price := p_price - v_discount_amount;

  -- Set expiry (24 hours from now)
  v_expires_at := NOW() + INTERVAL '24 hours';

  -- Generate unique code
  LOOP
    v_code := generate_coupon_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM coupon_issues WHERE code = v_code);
  END LOOP;

  -- Create user location point if provided
  IF p_user_lat IS NOT NULL AND p_user_lon IS NOT NULL THEN
    v_user_location := ST_SetSRID(ST_MakePoint(p_user_lon, p_user_lat), 4326)::geography;
  END IF;

  -- Insert coupon
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
END;
$$ LANGUAGE plpgsql VOLATILE;

-- RLS
ALTER TABLE coupon_issues ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE coupon_issues IS 'Issued discount coupons with lifecycle tracking';
COMMENT ON FUNCTION issue_coupon IS 'Issue a new coupon with automatic discount calculation';

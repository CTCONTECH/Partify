-- Supplier Settlement and Billing Tables

CREATE TABLE supplier_monthly_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  settlement_month DATE NOT NULL, -- First day of the month

  -- Aggregated metrics
  total_coupons_issued INTEGER DEFAULT 0,
  total_coupons_redeemed INTEGER DEFAULT 0,
  gross_order_value DECIMAL(12,2) DEFAULT 0,
  total_discounts_given DECIMAL(12,2) DEFAULT 0,

  -- Commission calculation
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(12,2) DEFAULT 0,

  -- Settlement status
  status settlement_status DEFAULT 'draft',
  generated_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  disputed_at TIMESTAMP WITH TIME ZONE,
  dispute_reason TEXT,

  -- Metadata
  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(supplier_id, settlement_month)
);

-- Indexes
CREATE INDEX settlements_supplier_idx ON supplier_monthly_settlements(supplier_id);
CREATE INDEX settlements_month_idx ON supplier_monthly_settlements(settlement_month DESC);
CREATE INDEX settlements_status_idx ON supplier_monthly_settlements(status);
CREATE INDEX settlements_unpaid_idx ON supplier_monthly_settlements(supplier_id, settlement_month)
  WHERE status IN ('generated', 'sent', 'disputed');

-- Updated timestamp trigger
CREATE TRIGGER update_settlements_updated_at
  BEFORE UPDATE ON supplier_monthly_settlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Settlement line items
CREATE TABLE settlement_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id UUID NOT NULL REFERENCES supplier_monthly_settlements(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupon_issues(id) ON DELETE CASCADE,

  -- Transaction details
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  part_number TEXT,
  part_name TEXT,
  original_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  actual_order_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX settlement_items_settlement_idx ON settlement_line_items(settlement_id);
CREATE INDEX settlement_items_coupon_idx ON settlement_line_items(coupon_id);

-- Function to generate monthly settlement
CREATE OR REPLACE FUNCTION generate_monthly_settlement(
  p_supplier_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_settlement_id UUID;
  v_settlement_month DATE;
  v_commission_rate DECIMAL;
  v_total_issued INTEGER;
  v_total_redeemed INTEGER;
  v_gross_value DECIMAL;
  v_total_discounts DECIMAL;
  v_commission_amount DECIMAL;
BEGIN
  -- Calculate settlement month
  v_settlement_month := make_date(p_year, p_month, 1);

  -- Get supplier commission rate
  SELECT commission_rate INTO v_commission_rate
  FROM suppliers
  WHERE id = p_supplier_id;

  -- Check if settlement already exists
  SELECT id INTO v_settlement_id
  FROM supplier_monthly_settlements
  WHERE supplier_id = p_supplier_id
    AND settlement_month = v_settlement_month;

  IF v_settlement_id IS NOT NULL THEN
    RAISE EXCEPTION 'Settlement already exists for this supplier and month';
  END IF;

  -- Calculate aggregates
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'redeemed'),
    COALESCE(SUM(actual_order_amount) FILTER (WHERE status = 'redeemed'), 0),
    COALESCE(SUM(discount_amount) FILTER (WHERE status = 'redeemed'), 0)
  INTO
    v_total_issued,
    v_total_redeemed,
    v_gross_value,
    v_total_discounts
  FROM coupon_issues
  WHERE supplier_id = p_supplier_id
    AND DATE_TRUNC('month', issued_at) = v_settlement_month;

  -- Calculate commission
  v_commission_amount := ROUND((v_gross_value * v_commission_rate / 100)::numeric, 2);

  -- Create settlement
  INSERT INTO supplier_monthly_settlements (
    supplier_id,
    settlement_month,
    total_coupons_issued,
    total_coupons_redeemed,
    gross_order_value,
    total_discounts_given,
    commission_rate,
    commission_amount,
    status,
    generated_at
  ) VALUES (
    p_supplier_id,
    v_settlement_month,
    v_total_issued,
    v_total_redeemed,
    v_gross_value,
    v_total_discounts,
    v_commission_rate,
    v_commission_amount,
    'generated',
    NOW()
  )
  RETURNING id INTO v_settlement_id;

  -- Create line items
  INSERT INTO settlement_line_items (
    settlement_id,
    coupon_id,
    redeemed_at,
    part_number,
    part_name,
    original_price,
    discount_amount,
    actual_order_amount,
    commission_rate,
    commission_amount
  )
  SELECT
    v_settlement_id,
    ci.id,
    ci.redeemed_at,
    p.part_number,
    p.part_name,
    ci.original_price,
    ci.discount_amount,
    ci.actual_order_amount,
    v_commission_rate,
    ROUND((ci.actual_order_amount * v_commission_rate / 100)::numeric, 2)
  FROM coupon_issues ci
  LEFT JOIN parts p ON p.id = ci.part_id
  WHERE ci.supplier_id = p_supplier_id
    AND ci.status = 'redeemed'
    AND DATE_TRUNC('month', ci.issued_at) = v_settlement_month;

  RETURN v_settlement_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to generate all settlements for a month
CREATE OR REPLACE FUNCTION generate_all_settlements_for_month(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  supplier_id UUID,
  settlement_id UUID,
  commission_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    generate_monthly_settlement(s.id, p_year, p_month),
    sms.commission_amount
  FROM suppliers s
  LEFT JOIN supplier_monthly_settlements sms
    ON sms.supplier_id = s.id
    AND sms.settlement_month = make_date(p_year, p_month, 1)
  WHERE s.active = true
    AND sms.id IS NULL -- Don't regenerate existing settlements
    AND EXISTS ( -- Only for suppliers with redeemed coupons
      SELECT 1 FROM coupon_issues ci
      WHERE ci.supplier_id = s.id
        AND ci.status = 'redeemed'
        AND DATE_TRUNC('month', ci.issued_at) = make_date(p_year, p_month, 1)
    );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- RLS
ALTER TABLE supplier_monthly_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_line_items ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE supplier_monthly_settlements IS 'Monthly billing statements for suppliers';
COMMENT ON TABLE settlement_line_items IS 'Individual coupon redemptions in a settlement';
COMMENT ON FUNCTION generate_monthly_settlement IS 'Generate settlement for one supplier for one month';
COMMENT ON FUNCTION generate_all_settlements_for_month IS 'Generate settlements for all suppliers for one month (run monthly via cron)';

-- Supplier activity event log.
-- Dashboard/activity pages read from this instead of guessing activity from source tables.

CREATE TABLE IF NOT EXISTS supplier_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'inventory_import_approved',
      'inventory_stock_updated',
      'inventory_price_updated',
      'inventory_low_stock',
      'supplier_profile_updated',
      'coupon_issued',
      'coupon_redeemed',
      'part_request_received',
      'part_request_resolved'
    )
  ),
  title TEXT NOT NULL,
  detail TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supplier_activity_events_supplier_created_idx
  ON supplier_activity_events(supplier_id, created_at DESC);

CREATE INDEX IF NOT EXISTS supplier_activity_events_type_idx
  ON supplier_activity_events(event_type);

ALTER TABLE supplier_activity_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON supplier_activity_events TO authenticated;

DROP POLICY IF EXISTS "Suppliers can view own activity" ON supplier_activity_events;
CREATE POLICY "Suppliers can view own activity"
  ON supplier_activity_events FOR SELECT
  USING (supplier_id = auth.uid());

DROP POLICY IF EXISTS "Suppliers can log own activity" ON supplier_activity_events;
CREATE POLICY "Suppliers can log own activity"
  ON supplier_activity_events FOR INSERT
  WITH CHECK (supplier_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_supplier_activity(
  p_supplier_id UUID,
  p_event_type TEXT,
  p_title TEXT,
  p_detail TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO supplier_activity_events (supplier_id, event_type, title, detail, metadata)
  VALUES (p_supplier_id, p_event_type, p_title, p_detail, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_supplier_activity(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_import_job_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.log_supplier_activity(
      NEW.supplier_id,
      'inventory_import_approved',
      'Part import approved',
      NEW.row_count || ' item' || CASE WHEN NEW.row_count = 1 THEN '' ELSE 's' END || ' processed',
      jsonb_build_object('import_job_id', NEW.id, 'source_type', NEW.source_type, 'row_count', NEW.row_count)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_import_job_activity_trigger ON import_jobs;
CREATE TRIGGER log_import_job_activity_trigger
  AFTER INSERT OR UPDATE OF status ON import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_import_job_activity();

CREATE OR REPLACE FUNCTION public.log_inventory_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_part_name TEXT;
BEGIN
  SELECT part_name INTO v_part_name
  FROM parts
  WHERE id = NEW.part_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_supplier_activity(
      NEW.supplier_id,
      CASE WHEN NEW.stock > 0 AND NEW.stock <= 5 THEN 'inventory_low_stock' ELSE 'inventory_stock_updated' END,
      COALESCE(v_part_name, 'Inventory item'),
      CASE
        WHEN NEW.stock > 0 AND NEW.stock <= 5 THEN 'Low stock: ' || NEW.stock || ' left'
        ELSE 'Stock set to ' || NEW.stock || ' - Price R ' || ROUND(NEW.price::numeric, 2)
      END,
      jsonb_build_object('inventory_id', NEW.id, 'part_id', NEW.part_id, 'stock', NEW.stock, 'price', NEW.price)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.stock IS DISTINCT FROM NEW.stock THEN
      PERFORM public.log_supplier_activity(
        NEW.supplier_id,
        CASE WHEN NEW.stock > 0 AND NEW.stock <= 5 THEN 'inventory_low_stock' ELSE 'inventory_stock_updated' END,
        COALESCE(v_part_name, 'Inventory item'),
        CASE
          WHEN NEW.stock > 0 AND NEW.stock <= 5 THEN 'Low stock: ' || NEW.stock || ' left'
          ELSE 'Stock updated to ' || NEW.stock
        END,
        jsonb_build_object('inventory_id', NEW.id, 'part_id', NEW.part_id, 'old_stock', OLD.stock, 'stock', NEW.stock)
      );
    END IF;

    IF OLD.price IS DISTINCT FROM NEW.price THEN
      PERFORM public.log_supplier_activity(
        NEW.supplier_id,
        'inventory_price_updated',
        COALESCE(v_part_name, 'Inventory item'),
        'Price updated to R ' || ROUND(NEW.price::numeric, 2),
        jsonb_build_object('inventory_id', NEW.id, 'part_id', NEW.part_id, 'old_price', OLD.price, 'price', NEW.price)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_inventory_activity_trigger ON supplier_inventory;
CREATE TRIGGER log_inventory_activity_trigger
  AFTER INSERT OR UPDATE OF stock, price ON supplier_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inventory_activity();

CREATE OR REPLACE FUNCTION public.log_supplier_profile_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.business_name IS DISTINCT FROM NEW.business_name
    OR OLD.address IS DISTINCT FROM NEW.address
    OR OLD.suburb IS DISTINCT FROM NEW.suburb
    OR OLD.coordinates IS DISTINCT FROM NEW.coordinates THEN
    PERFORM public.log_supplier_activity(
      NEW.id,
      'supplier_profile_updated',
      'Business details updated',
      'Supplier profile changed',
      jsonb_build_object('supplier_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_supplier_profile_activity_trigger ON suppliers;
CREATE TRIGGER log_supplier_profile_activity_trigger
  AFTER UPDATE OF business_name, address, suburb, coordinates ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_supplier_profile_activity();

-- Backfill useful activity for existing supplier data.
INSERT INTO supplier_activity_events (supplier_id, event_type, title, detail, metadata, created_at)
SELECT
  ij.supplier_id,
  'inventory_import_approved',
  'Part import approved',
  ij.row_count || ' item' || CASE WHEN ij.row_count = 1 THEN '' ELSE 's' END || ' processed',
  jsonb_build_object('import_job_id', ij.id, 'source_type', ij.source_type, 'row_count', ij.row_count),
  COALESCE(ij.updated_at, ij.created_at, NOW())
FROM import_jobs ij
WHERE ij.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM supplier_activity_events sae
    WHERE sae.event_type = 'inventory_import_approved'
      AND sae.metadata->>'import_job_id' = ij.id::text
  );

INSERT INTO supplier_activity_events (supplier_id, event_type, title, detail, metadata, created_at)
SELECT
  si.supplier_id,
  CASE WHEN si.stock > 0 AND si.stock <= 5 THEN 'inventory_low_stock' ELSE 'inventory_stock_updated' END,
  COALESCE(p.part_name, 'Inventory item'),
  CASE
    WHEN si.stock > 0 AND si.stock <= 5 THEN 'Low stock: ' || si.stock || ' left'
    ELSE 'Stock set to ' || si.stock || ' - Price R ' || ROUND(si.price::numeric, 2)
  END,
  jsonb_build_object('inventory_id', si.id, 'part_id', si.part_id, 'stock', si.stock, 'price', si.price),
  COALESCE(si.updated_at, si.created_at, NOW())
FROM supplier_inventory si
JOIN parts p ON p.id = si.part_id
WHERE NOT EXISTS (
  SELECT 1 FROM supplier_activity_events sae
  WHERE sae.metadata->>'inventory_id' = si.id::text
);

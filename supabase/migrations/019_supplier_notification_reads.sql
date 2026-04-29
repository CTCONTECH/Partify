-- Supplier notification read state.
-- Keeps notification acknowledgement tied to the supplier account instead of browser storage.

CREATE TABLE IF NOT EXISTS supplier_notification_reads (
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  notification_id TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (supplier_id, notification_id)
);

CREATE INDEX IF NOT EXISTS supplier_notification_reads_supplier_idx
  ON supplier_notification_reads(supplier_id, read_at DESC);

ALTER TABLE supplier_notification_reads ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON supplier_notification_reads TO authenticated;

DROP POLICY IF EXISTS "Suppliers can view own notification reads" ON supplier_notification_reads;
CREATE POLICY "Suppliers can view own notification reads"
  ON supplier_notification_reads FOR SELECT
  USING (supplier_id = auth.uid());

DROP POLICY IF EXISTS "Suppliers can mark own notifications read" ON supplier_notification_reads;
CREATE POLICY "Suppliers can mark own notifications read"
  ON supplier_notification_reads FOR INSERT
  WITH CHECK (supplier_id = auth.uid());

DROP POLICY IF EXISTS "Suppliers can update own notification reads" ON supplier_notification_reads;
CREATE POLICY "Suppliers can update own notification reads"
  ON supplier_notification_reads FOR UPDATE
  USING (supplier_id = auth.uid())
  WITH CHECK (supplier_id = auth.uid());

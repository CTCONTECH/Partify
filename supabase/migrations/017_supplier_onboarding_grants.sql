-- Allow authenticated suppliers to create and manage their own supplier profile.
-- RLS policies still restrict rows to id = auth.uid().

GRANT SELECT, INSERT, UPDATE ON suppliers TO authenticated;

DROP POLICY IF EXISTS "Suppliers can insert own record" ON suppliers;
CREATE POLICY "Suppliers can insert own record"
  ON suppliers FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Suppliers can update own details" ON suppliers;
CREATE POLICY "Suppliers can update own details"
  ON suppliers FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

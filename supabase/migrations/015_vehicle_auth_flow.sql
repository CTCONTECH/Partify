-- Vehicle auth flow hardening
-- Allows authenticated users to manage their own vehicles through RLS.

GRANT SELECT, INSERT, UPDATE, DELETE ON vehicles TO authenticated;

DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can manage own vehicles" ON vehicles;

CREATE POLICY "Users can view own vehicles"
  ON vehicles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own vehicles"
  ON vehicles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vehicles"
  ON vehicles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own vehicles"
  ON vehicles FOR DELETE
  USING (user_id = auth.uid());

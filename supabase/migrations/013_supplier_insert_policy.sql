-- Allow suppliers to create their own record during onboarding.
-- Suppliers can only insert a row where id = auth.uid() (enforced by FK to profiles as well).

CREATE POLICY "Suppliers can insert own record"
  ON suppliers FOR INSERT
  WITH CHECK (id = auth.uid());

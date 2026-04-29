-- Client notification read state.
-- Keeps client notification acknowledgement tied to the user account.

CREATE TABLE IF NOT EXISTS client_notification_reads (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_id TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_id)
);

CREATE INDEX IF NOT EXISTS client_notification_reads_user_idx
  ON client_notification_reads(user_id, read_at DESC);

ALTER TABLE client_notification_reads ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON client_notification_reads TO authenticated;

DROP POLICY IF EXISTS "Clients can view own notification reads" ON client_notification_reads;
CREATE POLICY "Clients can view own notification reads"
  ON client_notification_reads FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Clients can mark own notifications read" ON client_notification_reads;
CREATE POLICY "Clients can mark own notifications read"
  ON client_notification_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Clients can update own notification reads" ON client_notification_reads;
CREATE POLICY "Clients can update own notification reads"
  ON client_notification_reads FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Unified Supplier Import Staging Pipeline
-- Handles manual entry, CSV uploads, and future API/SFTP ingestion.
-- All paths go: receive → validate → alias-match → staging → approve → upsert live.

-- ──────────────────────────────────────────────────────────────
-- import_jobs — one record per upload / sync attempt
-- ──────────────────────────────────────────────────────────────
CREATE TABLE import_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  source_type   TEXT NOT NULL CHECK (source_type IN ('manual', 'csv', 'api', 'sftp')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'review', 'approved', 'rejected', 'error')),
  file_name     TEXT,                -- original filename for csv/sftp uploads
  row_count     INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  unmatched_count INTEGER NOT NULL DEFAULT 0,
  error_count   INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX import_jobs_supplier_idx ON import_jobs(supplier_id);
CREATE INDEX import_jobs_status_idx   ON import_jobs(status);

CREATE TRIGGER update_import_jobs_updated_at
  BEFORE UPDATE ON import_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers see own import jobs"
  ON import_jobs FOR SELECT
  USING (supplier_id = auth.uid());

CREATE POLICY "Suppliers create own import jobs"
  ON import_jobs FOR INSERT
  WITH CHECK (supplier_id = auth.uid());

CREATE POLICY "Suppliers update own import jobs"
  ON import_jobs FOR UPDATE
  USING (supplier_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- import_rows — one record per line item within a job
-- ──────────────────────────────────────────────────────────────
CREATE TABLE import_rows (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                 UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number             INTEGER NOT NULL,          -- original row/line position for traceability
  raw_part_number        TEXT NOT NULL,             -- exactly as received from supplier
  normalized_part_number TEXT GENERATED ALWAYS AS (
    regexp_replace(upper(raw_part_number), '[^A-Z0-9]', '', 'g')
  ) STORED,
  raw_description        TEXT,                      -- optional extra text from supplier
  price                  DECIMAL(10,2),
  stock                  INTEGER,
  match_status           TEXT NOT NULL DEFAULT 'pending'
                           CHECK (match_status IN ('pending', 'matched', 'unmatched', 'error', 'skipped')),
  matched_part_id        UUID REFERENCES parts(id) ON DELETE SET NULL,
  error_reason           TEXT,                      -- human-readable reason when match_status='error'
  approved_at            TIMESTAMP WITH TIME ZONE,
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX import_rows_job_idx    ON import_rows(job_id);
CREATE INDEX import_rows_status_idx ON import_rows(job_id, match_status);

ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;

-- Inherit access through import_jobs
CREATE POLICY "Suppliers access own import rows"
  ON import_rows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM import_jobs ij
      WHERE ij.id = import_rows.job_id
        AND ij.supplier_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- process_import_job()
-- Auto-match rows to parts via alias table; returns match stats.
-- Call after all import_rows for a job have been inserted.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_import_job(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_matched   INTEGER := 0;
  v_unmatched INTEGER := 0;
  v_row       RECORD;
BEGIN
  -- Try to resolve each pending row via the alias table
  FOR v_row IN
    SELECT id, normalized_part_number
    FROM import_rows
    WHERE job_id = p_job_id
      AND match_status = 'pending'
  LOOP
    DECLARE
      v_part_id UUID;
    BEGIN
      SELECT part_id INTO v_part_id
      FROM part_number_aliases
      WHERE alias_part_number_normalized = v_row.normalized_part_number
      LIMIT 1;

      IF v_part_id IS NOT NULL THEN
        UPDATE import_rows
        SET match_status    = 'matched',
            matched_part_id = v_part_id
        WHERE id = v_row.id;
        v_matched := v_matched + 1;
      ELSE
        UPDATE import_rows
        SET match_status = 'unmatched'
        WHERE id = v_row.id;
        v_unmatched := v_unmatched + 1;
      END IF;
    END;
  END LOOP;

  -- Refresh summary counts on the parent job
  UPDATE import_jobs
  SET matched_count   = (SELECT COUNT(*) FROM import_rows WHERE job_id = p_job_id AND match_status = 'matched'),
      unmatched_count = (SELECT COUNT(*) FROM import_rows WHERE job_id = p_job_id AND match_status = 'unmatched'),
      error_count     = (SELECT COUNT(*) FROM import_rows WHERE job_id = p_job_id AND match_status = 'error'),
      status          = 'review'
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'matched',   v_matched,
    'unmatched', v_unmatched
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- approve_import_job()
-- Upserts all matched rows into supplier_inventory and
-- registers supplier-specific aliases for any new part numbers.
-- Idempotent: safe to call multiple times (ON CONFLICT DO UPDATE).
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION approve_import_job(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supplier_id UUID;
  v_upserted    INTEGER := 0;
  v_row         RECORD;
BEGIN
  SELECT supplier_id INTO v_supplier_id
  FROM import_jobs
  WHERE id = p_job_id;

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'import_job % not found', p_job_id;
  END IF;

  FOR v_row IN
    SELECT ir.matched_part_id, ir.price, ir.stock, ir.raw_part_number
    FROM import_rows ir
    WHERE ir.job_id = p_job_id
      AND ir.match_status = 'matched'
      AND ir.matched_part_id IS NOT NULL
  LOOP
    -- Upsert into live supplier_inventory
    INSERT INTO supplier_inventory (supplier_id, part_id, price, stock, supplier_part_number)
    VALUES (v_supplier_id, v_row.matched_part_id, v_row.price, v_row.stock, v_row.raw_part_number)
    ON CONFLICT (supplier_id, part_id)
    DO UPDATE SET
      price                = EXCLUDED.price,
      stock                = EXCLUDED.stock,
      supplier_part_number = EXCLUDED.supplier_part_number,
      updated_at           = NOW();

    -- Register supplier alias so future imports auto-match
    INSERT INTO part_number_aliases (part_id, supplier_id, alias_part_number, source_type, is_primary)
    VALUES (v_row.matched_part_id, v_supplier_id, v_row.raw_part_number, 'supplier', false)
    ON CONFLICT (part_id, supplier_id, alias_part_number_normalized) DO NOTHING;

    -- Mark row as approved
    UPDATE import_rows
    SET approved_at = NOW()
    WHERE job_id = p_job_id
      AND matched_part_id = v_row.matched_part_id;

    v_upserted := v_upserted + 1;
  END LOOP;

  -- Mark job complete
  UPDATE import_jobs
  SET status = 'approved'
  WHERE id = p_job_id;

  RETURN jsonb_build_object('upserted', v_upserted);
END;
$$;

-- Import row validation hardening.
-- Ensures staging rows are validated in the database before alias matching or
-- approval, so future API/SFTP/admin import paths cannot bypass CSV checks.

CREATE OR REPLACE FUNCTION public.process_import_job(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_id UUID;
  v_matched INTEGER := 0;
  v_unmatched INTEGER := 0;
  v_error INTEGER := 0;
  v_row RECORD;
  v_part_id UUID;
  v_match_count INTEGER;
  v_match_reason TEXT;
  v_match_confidence NUMERIC(4,3);
  v_validation_errors TEXT[];
BEGIN
  SELECT supplier_id INTO v_supplier_id
  FROM import_jobs
  WHERE id = p_job_id;

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'import_job % not found', p_job_id;
  END IF;

  FOR v_row IN
    SELECT id, raw_part_number, normalized_part_number, price, stock
    FROM import_rows
    WHERE job_id = p_job_id
      AND match_status IN ('pending', 'unmatched', 'error')
  LOOP
    v_validation_errors := ARRAY[]::TEXT[];
    v_part_id := NULL;
    v_match_count := 0;
    v_match_reason := NULL;
    v_match_confidence := NULL;

    IF NULLIF(BTRIM(v_row.raw_part_number), '') IS NULL THEN
      v_validation_errors := array_append(v_validation_errors, 'Missing part number');
    END IF;

    IF NULLIF(BTRIM(v_row.normalized_part_number), '') IS NULL THEN
      v_validation_errors := array_append(v_validation_errors, 'Part number must include letters or numbers');
    END IF;

    IF v_row.price IS NULL THEN
      v_validation_errors := array_append(v_validation_errors, 'Price is required');
    ELSIF v_row.price < 0 THEN
      v_validation_errors := array_append(v_validation_errors, 'Price cannot be negative');
    END IF;

    IF v_row.stock IS NULL THEN
      v_validation_errors := array_append(v_validation_errors, 'Stock is required');
    ELSIF v_row.stock < 0 THEN
      v_validation_errors := array_append(v_validation_errors, 'Stock cannot be negative');
    END IF;

    IF array_length(v_validation_errors, 1) IS NOT NULL THEN
      UPDATE import_rows
      SET
        match_status = 'error',
        matched_part_id = NULL,
        match_reason = 'row_validation_failed',
        match_confidence = NULL,
        error_reason = array_to_string(v_validation_errors, '; ')
      WHERE id = v_row.id;

      v_error := v_error + 1;
      CONTINUE;
    END IF;

    SELECT COUNT(DISTINCT pna.part_id), (ARRAY_AGG(DISTINCT pna.part_id))[1]
    INTO v_match_count, v_part_id
    FROM part_number_aliases pna
    WHERE pna.alias_part_number_normalized = v_row.normalized_part_number
      AND pna.supplier_id = v_supplier_id;

    IF v_match_count = 1 THEN
      v_match_reason := 'supplier_alias_exact';
      v_match_confidence := 1.000;
    ELSIF v_match_count > 1 THEN
      UPDATE import_rows
      SET
        match_status = 'unmatched',
        matched_part_id = NULL,
        match_reason = 'ambiguous_supplier_alias',
        match_confidence = NULL,
        error_reason = 'Multiple supplier aliases match this part number'
      WHERE id = v_row.id;

      v_unmatched := v_unmatched + 1;
      CONTINUE;
    END IF;

    IF v_part_id IS NULL THEN
      SELECT COUNT(DISTINCT pna.part_id), (ARRAY_AGG(DISTINCT pna.part_id))[1]
      INTO v_match_count, v_part_id
      FROM part_number_aliases pna
      WHERE pna.alias_part_number_normalized = v_row.normalized_part_number
        AND pna.supplier_id IS NULL;

      IF v_match_count = 1 THEN
        v_match_reason := 'global_alias_exact';
        v_match_confidence := 0.980;
      ELSIF v_match_count > 1 THEN
        UPDATE import_rows
        SET
          match_status = 'unmatched',
          matched_part_id = NULL,
          match_reason = 'ambiguous_global_alias',
          match_confidence = NULL,
          error_reason = 'Multiple catalogue aliases match this part number'
        WHERE id = v_row.id;

        v_unmatched := v_unmatched + 1;
        CONTINUE;
      END IF;
    END IF;

    IF v_part_id IS NULL THEN
      SELECT COUNT(*), (ARRAY_AGG(p.id))[1]
      INTO v_match_count, v_part_id
      FROM parts p
      WHERE regexp_replace(upper(p.part_number), '[^A-Z0-9]', '', 'g') = v_row.normalized_part_number;

      IF v_match_count = 1 THEN
        v_match_reason := 'canonical_part_number_exact';
        v_match_confidence := 0.950;
      ELSIF v_match_count > 1 THEN
        UPDATE import_rows
        SET
          match_status = 'unmatched',
          matched_part_id = NULL,
          match_reason = 'ambiguous_canonical_part_number',
          match_confidence = NULL,
          error_reason = 'Multiple canonical parts match this part number'
        WHERE id = v_row.id;

        v_unmatched := v_unmatched + 1;
        CONTINUE;
      END IF;
    END IF;

    IF v_part_id IS NOT NULL THEN
      UPDATE import_rows
      SET
        match_status = 'matched',
        matched_part_id = v_part_id,
        match_reason = v_match_reason,
        match_confidence = v_match_confidence,
        error_reason = NULL
      WHERE id = v_row.id;

      v_matched := v_matched + 1;
    ELSE
      UPDATE import_rows
      SET
        match_status = 'unmatched',
        matched_part_id = NULL,
        match_reason = 'no_alias_or_canonical_match',
        match_confidence = NULL,
        error_reason = NULL
      WHERE id = v_row.id;

      v_unmatched := v_unmatched + 1;
    END IF;
  END LOOP;

  UPDATE import_jobs
  SET
    matched_count = (SELECT COUNT(*) FROM import_rows WHERE job_id = p_job_id AND match_status = 'matched'),
    unmatched_count = (SELECT COUNT(*) FROM import_rows WHERE job_id = p_job_id AND match_status = 'unmatched'),
    error_count = (SELECT COUNT(*) FROM import_rows WHERE job_id = p_job_id AND match_status = 'error'),
    status = 'review'
  WHERE id = p_job_id;

  SELECT COUNT(*) INTO v_error
  FROM import_rows
  WHERE job_id = p_job_id
    AND match_status = 'error';

  RETURN jsonb_build_object(
    'matched', v_matched,
    'unmatched', v_unmatched,
    'error', v_error
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_import_job(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_id UUID;
  v_upserted INTEGER := 0;
  v_row RECORD;
BEGIN
  SELECT supplier_id INTO v_supplier_id
  FROM import_jobs
  WHERE id = p_job_id;

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'import_job % not found', p_job_id;
  END IF;

  PERFORM public.process_import_job(p_job_id);

  IF EXISTS (
    SELECT 1
    FROM import_rows
    WHERE job_id = p_job_id
      AND match_status = 'error'
  ) THEN
    RAISE EXCEPTION 'Import has row validation errors. Fix or remove error rows before approval.';
  END IF;

  FOR v_row IN
    SELECT ir.id, ir.matched_part_id, ir.price, ir.stock, ir.raw_part_number
    FROM import_rows ir
    WHERE ir.job_id = p_job_id
      AND ir.match_status = 'matched'
      AND ir.matched_part_id IS NOT NULL
      AND ir.price IS NOT NULL
      AND ir.price >= 0
      AND ir.stock IS NOT NULL
      AND ir.stock >= 0
  LOOP
    INSERT INTO supplier_inventory (supplier_id, part_id, price, stock, supplier_part_number)
    VALUES (v_supplier_id, v_row.matched_part_id, v_row.price, v_row.stock, v_row.raw_part_number)
    ON CONFLICT (supplier_id, part_id)
    DO UPDATE SET
      price = EXCLUDED.price,
      stock = EXCLUDED.stock,
      supplier_part_number = EXCLUDED.supplier_part_number,
      updated_at = NOW();

    INSERT INTO part_number_aliases (part_id, supplier_id, alias_part_number, source_type, is_primary)
    VALUES (v_row.matched_part_id, v_supplier_id, v_row.raw_part_number, 'supplier', false)
    ON CONFLICT (part_id, supplier_id, alias_part_number_normalized) DO NOTHING;

    UPDATE import_rows
    SET approved_at = NOW()
    WHERE id = v_row.id;

    v_upserted := v_upserted + 1;
  END LOOP;

  UPDATE import_jobs
  SET status = 'approved'
  WHERE id = p_job_id;

  RETURN jsonb_build_object('upserted', v_upserted);
END;
$$;

COMMENT ON FUNCTION public.process_import_job(UUID)
  IS 'Validates import rows, then matches valid rows to canonical parts using supplier aliases, global aliases, and canonical part numbers';

COMMENT ON FUNCTION public.approve_import_job(UUID)
  IS 'Revalidates import rows, blocks approval when validation errors exist, and upserts matched valid rows into live inventory';

-- Supplier import alias matching hardening.
-- Keeps imports tied to canonical Partify parts while making matching more
-- useful for real supplier catalogues.

ALTER TABLE public.import_rows
  ADD COLUMN IF NOT EXISTS match_reason TEXT,
  ADD COLUMN IF NOT EXISTS match_confidence NUMERIC(4,3);

CREATE INDEX IF NOT EXISTS part_number_aliases_supplier_number_idx
  ON public.part_number_aliases (supplier_id, alias_part_number_normalized);

CREATE INDEX IF NOT EXISTS parts_part_number_normalized_idx
  ON public.parts ((regexp_replace(upper(part_number), '[^A-Z0-9]', '', 'g')));

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
BEGIN
  SELECT supplier_id INTO v_supplier_id
  FROM import_jobs
  WHERE id = p_job_id;

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'import_job % not found', p_job_id;
  END IF;

  FOR v_row IN
    SELECT id, normalized_part_number
    FROM import_rows
    WHERE job_id = p_job_id
      AND match_status IN ('pending', 'unmatched')
  LOOP
    v_part_id := NULL;
    v_match_count := 0;
    v_match_reason := NULL;
    v_match_confidence := NULL;

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

COMMENT ON COLUMN public.import_rows.match_reason
  IS 'How an import row was matched, for example supplier_alias_exact, global_alias_exact, canonical_part_number_exact, or no_alias_or_canonical_match';

COMMENT ON COLUMN public.import_rows.match_confidence
  IS 'Conservative confidence score for automatic import matching; ambiguous rows are left unmatched for review';

COMMENT ON FUNCTION public.process_import_job(UUID)
  IS 'Matches import rows to canonical parts using supplier aliases, global aliases, then canonical part numbers; ambiguous rows stay unmatched for review';

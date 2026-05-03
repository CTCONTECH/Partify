-- Import job idempotency.
-- Prevents duplicate active staging jobs when a supplier re-uploads or
-- double-submits the exact same CSV file.

ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS file_hash TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS import_jobs_one_active_file_hash_idx
  ON public.import_jobs (supplier_id, source_type, file_hash)
  WHERE file_hash IS NOT NULL
    AND status IN ('pending', 'processing', 'review');

COMMENT ON COLUMN public.import_jobs.file_hash
  IS 'SHA-256 hash of the uploaded source file used to avoid duplicate active import jobs';

COMMENT ON COLUMN public.import_jobs.file_size_bytes
  IS 'Original uploaded file size in bytes for support and duplicate import diagnostics';

COMMENT ON INDEX public.import_jobs_one_active_file_hash_idx
  IS 'Allows only one active import job per supplier/source/file hash; approved or rejected imports may be re-submitted later';

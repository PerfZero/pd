-- Manual migration for R3 (legacy plaintext cleanup, step 1)
-- IMPORTANT:
-- 1) This file is intentionally outside auto-run migration directory.
-- 2) Apply manually after confirming:
--    - FIELD_ENCRYPTION_ENABLED=true
--    - backfill is complete
--    - app runs with FIELD_ENCRYPTION_KEEP_LEGACY_DOC_PLAINTEXT=false

BEGIN;

UPDATE public.employees
SET
  passport_number = NULL
WHERE
  passport_number IS NOT NULL
  AND passport_number_enc IS NOT NULL
  AND passport_number_hash IS NOT NULL
  AND passport_number_key_version IS NOT NULL;

UPDATE public.employees
SET
  kig = NULL
WHERE
  kig IS NOT NULL
  AND kig_enc IS NOT NULL
  AND kig_hash IS NOT NULL
  AND kig_key_version IS NOT NULL;

UPDATE public.employees
SET
  patent_number = NULL
WHERE
  patent_number IS NOT NULL
  AND patent_number_enc IS NOT NULL
  AND patent_number_hash IS NOT NULL
  AND patent_number_key_version IS NOT NULL;

COMMIT;

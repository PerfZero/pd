BEGIN;

DROP INDEX IF EXISTS public.idx_files_is_encrypted;

ALTER TABLE public.files
  DROP COLUMN IF EXISTS is_encrypted,
  DROP COLUMN IF EXISTS encryption_algorithm,
  DROP COLUMN IF EXISTS encryption_iv,
  DROP COLUMN IF EXISTS encryption_tag,
  DROP COLUMN IF EXISTS encryption_key_version;

COMMIT;

BEGIN;

ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS is_encrypted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS encryption_algorithm character varying(32),
  ADD COLUMN IF NOT EXISTS encryption_iv character varying(64),
  ADD COLUMN IF NOT EXISTS encryption_tag character varying(64),
  ADD COLUMN IF NOT EXISTS encryption_key_version character varying(16);

CREATE INDEX IF NOT EXISTS idx_files_is_encrypted
  ON public.files USING btree (is_encrypted);

COMMIT;

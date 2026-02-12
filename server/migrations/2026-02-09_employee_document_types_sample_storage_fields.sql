BEGIN;

ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS sample_file_path text,
  ADD COLUMN IF NOT EXISTS sample_original_name text;

CREATE INDEX IF NOT EXISTS idx_document_types_sample_file_path
  ON public.document_types USING btree (sample_file_path);

COMMIT;

BEGIN;

ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT false;

COMMIT;

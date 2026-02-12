BEGIN;

-- Compatibility migration: some runtime queries still reference these legacy plaintext columns.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS passport_number text,
  ADD COLUMN IF NOT EXISTS kig character varying(50),
  ADD COLUMN IF NOT EXISTS patent_number text;

COMMIT;

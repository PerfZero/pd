BEGIN;

ALTER TABLE public.employees
  DROP COLUMN IF EXISTS passport_number,
  DROP COLUMN IF EXISTS kig,
  DROP COLUMN IF EXISTS patent_number;

COMMIT;

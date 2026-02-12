BEGIN;

-- Final R3 step: remove legacy plaintext document fields after backfill and read/search switch.
ALTER TABLE public.employees
  DROP COLUMN IF EXISTS passport_number,
  DROP COLUMN IF EXISTS kig,
  DROP COLUMN IF EXISTS patent_number;

COMMIT;

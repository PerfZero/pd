-- Rollback for 2026-02-09_employee_field_level_encryption_v1.sql
-- IMPORTANT:
-- 1) This file is intentionally placed outside automatic migration runner path.
-- 2) Apply manually only after backup and validation.

BEGIN;

DROP INDEX IF EXISTS public.employees_passport_number_hash_unique;
DROP INDEX IF EXISTS public.employees_kig_hash_unique;

DROP INDEX IF EXISTS public.idx_employees_last_name_hash;
DROP INDEX IF EXISTS public.idx_employees_passport_number_hash;
DROP INDEX IF EXISTS public.idx_employees_kig_hash;
DROP INDEX IF EXISTS public.idx_employees_patent_number_hash;

ALTER TABLE public.employees
  DROP COLUMN IF EXISTS last_name_enc,
  DROP COLUMN IF EXISTS last_name_hash,
  DROP COLUMN IF EXISTS last_name_key_version,
  DROP COLUMN IF EXISTS passport_number_enc,
  DROP COLUMN IF EXISTS passport_number_hash,
  DROP COLUMN IF EXISTS passport_number_key_version,
  DROP COLUMN IF EXISTS kig_enc,
  DROP COLUMN IF EXISTS kig_hash,
  DROP COLUMN IF EXISTS kig_key_version,
  DROP COLUMN IF EXISTS patent_number_enc,
  DROP COLUMN IF EXISTS patent_number_hash,
  DROP COLUMN IF EXISTS patent_number_key_version;

COMMIT;

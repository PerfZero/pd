BEGIN;

-- Required for efficient ILIKE '%...%' search by full name parts.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping pg_trgm extension creation due to insufficient privileges';
END $$;

-- FIO search indexes used by analytics/documents table filters.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_employees_last_name_trgm
        ON public.employees USING gin (last_name gin_trgm_ops)
        WHERE is_deleted = FALSE AND last_name IS NOT NULL
    ';
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_employees_first_name_trgm
        ON public.employees USING gin (first_name gin_trgm_ops)
        WHERE is_deleted = FALSE AND first_name IS NOT NULL
    ';
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_employees_middle_name_trgm
        ON public.employees USING gin (middle_name gin_trgm_ops)
        WHERE is_deleted = FALSE AND middle_name IS NOT NULL
    ';
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_employees_full_name_trgm
        ON public.employees USING gin (((coalesce(last_name, '''') || '' '' || coalesce(first_name, '''') || '' '' || coalesce(middle_name, ''''))) gin_trgm_ops)
        WHERE is_deleted = FALSE
    ';
  ELSE
    RAISE NOTICE 'Skipping trigram indexes because pg_trgm is unavailable';
  END IF;
END $$;

-- Document number/date indexes used in frequent filters and report datasets.
CREATE INDEX IF NOT EXISTS idx_employees_patent_number
  ON public.employees USING btree (patent_number)
  WHERE patent_number IS NOT NULL AND patent_number <> '';

CREATE INDEX IF NOT EXISTS idx_employees_birth_date
  ON public.employees USING btree (birth_date)
  WHERE birth_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_passport_date
  ON public.employees USING btree (passport_date)
  WHERE passport_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_passport_expiry_date
  ON public.employees USING btree (passport_expiry_date)
  WHERE passport_expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_kig_end_date
  ON public.employees USING btree (kig_end_date)
  WHERE kig_end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_patent_issue_date
  ON public.employees USING btree (patent_issue_date)
  WHERE patent_issue_date IS NOT NULL;

-- Join-oriented indexes for scoped employee datasets.
CREATE INDEX IF NOT EXISTS idx_ecm_counterparty_employee
  ON public.employee_counterparty_mapping USING btree (counterparty_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_ecm_employee_counterparty_site
  ON public.employee_counterparty_mapping USING btree (employee_id, counterparty_id, construction_site_id);

-- Optimizes "latest file per employee + document type" lookup.
CREATE INDEX IF NOT EXISTS idx_files_employee_doc_latest
  ON public.files USING btree (employee_id, entity_type, is_deleted, document_type, created_at DESC)
  WHERE employee_id IS NOT NULL;

-- Optimizes analytics joins constrained by external system and event time.
CREATE INDEX IF NOT EXISTS idx_skud_access_events_system_employee_time
  ON public.skud_access_events USING btree (external_system, employee_id, event_time DESC);

COMMIT;

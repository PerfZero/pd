BEGIN;

DROP INDEX IF EXISTS public.idx_skud_access_events_system_employee_time;
DROP INDEX IF EXISTS public.idx_files_employee_doc_latest;
DROP INDEX IF EXISTS public.idx_ecm_employee_counterparty_site;
DROP INDEX IF EXISTS public.idx_ecm_counterparty_employee;
DROP INDEX IF EXISTS public.idx_employees_patent_issue_date;
DROP INDEX IF EXISTS public.idx_employees_kig_end_date;
DROP INDEX IF EXISTS public.idx_employees_passport_expiry_date;
DROP INDEX IF EXISTS public.idx_employees_passport_date;
DROP INDEX IF EXISTS public.idx_employees_birth_date;
DROP INDEX IF EXISTS public.idx_employees_patent_number;
DROP INDEX IF EXISTS public.idx_employees_full_name_trgm;
DROP INDEX IF EXISTS public.idx_employees_middle_name_trgm;
DROP INDEX IF EXISTS public.idx_employees_first_name_trgm;
DROP INDEX IF EXISTS public.idx_employees_last_name_trgm;

COMMIT;

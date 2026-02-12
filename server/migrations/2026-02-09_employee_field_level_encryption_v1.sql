-- Field-level encryption support for sensitive employee fields (phase 1)
-- Adds encrypted payload, search hash and key version columns.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS last_name_enc text,
  ADD COLUMN IF NOT EXISTS last_name_hash character varying(64),
  ADD COLUMN IF NOT EXISTS last_name_key_version character varying(16),
  ADD COLUMN IF NOT EXISTS passport_number_enc text,
  ADD COLUMN IF NOT EXISTS passport_number_hash character varying(64),
  ADD COLUMN IF NOT EXISTS passport_number_key_version character varying(16),
  ADD COLUMN IF NOT EXISTS kig_enc text,
  ADD COLUMN IF NOT EXISTS kig_hash character varying(64),
  ADD COLUMN IF NOT EXISTS kig_key_version character varying(16),
  ADD COLUMN IF NOT EXISTS patent_number_enc text,
  ADD COLUMN IF NOT EXISTS patent_number_hash character varying(64),
  ADD COLUMN IF NOT EXISTS patent_number_key_version character varying(16);

COMMENT ON COLUMN public.employees.last_name_enc IS 'Encrypted last name payload (AES-256-GCM envelope)';
COMMENT ON COLUMN public.employees.last_name_hash IS 'HMAC-SHA-256 of normalized last name for exact search';
COMMENT ON COLUMN public.employees.last_name_key_version IS 'Key version for last_name_enc';

COMMENT ON COLUMN public.employees.passport_number_enc IS 'Encrypted passport number payload (AES-256-GCM envelope)';
COMMENT ON COLUMN public.employees.passport_number_hash IS 'HMAC-SHA-256 of normalized passport number for exact search and uniqueness';
COMMENT ON COLUMN public.employees.passport_number_key_version IS 'Key version for passport_number_enc';

COMMENT ON COLUMN public.employees.kig_enc IS 'Encrypted KIG payload (AES-256-GCM envelope)';
COMMENT ON COLUMN public.employees.kig_hash IS 'HMAC-SHA-256 of normalized KIG for exact search and uniqueness';
COMMENT ON COLUMN public.employees.kig_key_version IS 'Key version for kig_enc';

COMMENT ON COLUMN public.employees.patent_number_enc IS 'Encrypted patent number payload (AES-256-GCM envelope)';
COMMENT ON COLUMN public.employees.patent_number_hash IS 'HMAC-SHA-256 of normalized patent number for exact search';
COMMENT ON COLUMN public.employees.patent_number_key_version IS 'Key version for patent_number_enc';

CREATE INDEX IF NOT EXISTS idx_employees_last_name_hash
  ON public.employees USING btree (last_name_hash)
  WHERE ((last_name_hash IS NOT NULL) AND ((last_name_hash)::text <> ''::text));

CREATE INDEX IF NOT EXISTS idx_employees_passport_number_hash
  ON public.employees USING btree (passport_number_hash)
  WHERE ((passport_number_hash IS NOT NULL) AND ((passport_number_hash)::text <> ''::text));

CREATE INDEX IF NOT EXISTS idx_employees_kig_hash
  ON public.employees USING btree (kig_hash)
  WHERE ((kig_hash IS NOT NULL) AND ((kig_hash)::text <> ''::text));

CREATE INDEX IF NOT EXISTS idx_employees_patent_number_hash
  ON public.employees USING btree (patent_number_hash)
  WHERE ((patent_number_hash IS NOT NULL) AND ((patent_number_hash)::text <> ''::text));

CREATE UNIQUE INDEX IF NOT EXISTS employees_passport_number_hash_unique
  ON public.employees USING btree (passport_number_hash)
  WHERE ((passport_number_hash IS NOT NULL) AND ((passport_number_hash)::text <> ''::text));

CREATE UNIQUE INDEX IF NOT EXISTS employees_kig_hash_unique
  ON public.employees USING btree (kig_hash)
  WHERE ((kig_hash IS NOT NULL) AND ((kig_hash)::text <> ''::text));

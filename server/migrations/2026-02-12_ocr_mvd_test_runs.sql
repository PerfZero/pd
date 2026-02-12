BEGIN;

CREATE TABLE IF NOT EXISTS public.ocr_mvd_test_runs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  employee_id uuid NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  file_name text NOT NULL,
  document_type varchar(64) NOT NULL,
  prompt_used text NULL,
  model_used text NULL,
  ocr_status varchar(32) NOT NULL DEFAULT 'error',
  ocr_missing_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ocr_normalized jsonb NULL,
  ocr_raw jsonb NULL,
  ocr_error text NULL,
  ocr_provider varchar(64) NULL,
  mvd_type varchar(64) NULL,
  mvd_status varchar(32) NULL,
  mvd_params jsonb NULL,
  mvd_missing_params jsonb NOT NULL DEFAULT '[]'::jsonb,
  mvd_result jsonb NULL,
  mvd_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ocr_mvd_test_runs_pkey PRIMARY KEY (id),
  CONSTRAINT ocr_mvd_test_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT ocr_mvd_test_runs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ocr_mvd_test_runs_user_created_at
  ON public.ocr_mvd_test_runs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ocr_mvd_test_runs_employee_id
  ON public.ocr_mvd_test_runs (employee_id);

COMMIT;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS marked_for_deletion boolean DEFAULT false;

UPDATE public.employees
  SET is_deleted = false
  WHERE is_deleted IS NULL;

UPDATE public.employees
  SET marked_for_deletion = false
  WHERE marked_for_deletion IS NULL;

ALTER TABLE public.employees
  ALTER COLUMN is_deleted SET NOT NULL,
  ALTER COLUMN marked_for_deletion SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_is_deleted
  ON public.employees (is_deleted);

CREATE INDEX IF NOT EXISTS idx_employees_marked_for_deletion
  ON public.employees (marked_for_deletion);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE public.users
  SET is_deleted = false
  WHERE is_deleted IS NULL;

ALTER TABLE public.users
  ALTER COLUMN is_deleted SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_is_deleted
  ON public.users (is_deleted);

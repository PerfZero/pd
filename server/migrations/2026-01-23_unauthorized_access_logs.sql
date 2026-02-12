CREATE TABLE IF NOT EXISTS public.unauthorized_access_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  status_code integer NOT NULL,
  method character varying(10) NOT NULL,
  path text NOT NULL,
  ip_address character varying(45),
  user_agent text,
  error_message text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_unauth_logs_user_id
  ON public.unauthorized_access_logs USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_unauth_logs_status_code
  ON public.unauthorized_access_logs USING btree (status_code);

CREATE INDEX IF NOT EXISTS idx_unauth_logs_created_at
  ON public.unauthorized_access_logs USING btree (created_at);

BEGIN;

CREATE TABLE IF NOT EXISTS public.skud_person_bindings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  employee_id uuid NOT NULL,
  external_system character varying(32) NOT NULL DEFAULT 'sigur',
  external_emp_id character varying(128) NOT NULL,
  source character varying(32) NOT NULL DEFAULT 'manual',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT skud_person_bindings_pkey PRIMARY KEY (id),
  CONSTRAINT skud_person_bindings_employee_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT skud_person_bindings_created_by_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT skud_person_bindings_updated_by_fk FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT skud_person_bindings_external_unique UNIQUE (external_system, external_emp_id),
  CONSTRAINT skud_person_bindings_employee_system_unique UNIQUE (employee_id, external_system)
);

CREATE INDEX IF NOT EXISTS idx_skud_person_bindings_employee_id
  ON public.skud_person_bindings USING btree (employee_id);

CREATE INDEX IF NOT EXISTS idx_skud_person_bindings_active
  ON public.skud_person_bindings USING btree (is_active);

CREATE TABLE IF NOT EXISTS public.skud_access_states (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  employee_id uuid NOT NULL,
  external_system character varying(32) NOT NULL DEFAULT 'sigur',
  status character varying(32) NOT NULL DEFAULT 'pending',
  status_reason text,
  reason_code character varying(64),
  source character varying(32) NOT NULL DEFAULT 'manual',
  effective_from timestamp with time zone NOT NULL DEFAULT now(),
  effective_to timestamp with time zone,
  changed_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT skud_access_states_pkey PRIMARY KEY (id),
  CONSTRAINT skud_access_states_employee_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT skud_access_states_changed_by_fk FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT skud_access_states_status_check CHECK (status IN ('pending', 'allowed', 'blocked', 'revoked', 'deleted')),
  CONSTRAINT skud_access_states_employee_system_unique UNIQUE (employee_id, external_system)
);

CREATE INDEX IF NOT EXISTS idx_skud_access_states_status
  ON public.skud_access_states USING btree (status);

CREATE INDEX IF NOT EXISTS idx_skud_access_states_updated_at
  ON public.skud_access_states USING btree (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.skud_cards (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  employee_id uuid,
  external_system character varying(32) NOT NULL DEFAULT 'sigur',
  external_card_id character varying(128),
  card_number character varying(128) NOT NULL,
  card_number_normalized character varying(128) NOT NULL,
  card_type character varying(32) NOT NULL DEFAULT 'rfid',
  status character varying(32) NOT NULL DEFAULT 'active',
  issued_at timestamp with time zone,
  blocked_at timestamp with time zone,
  last_seen_at timestamp with time zone,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT skud_cards_pkey PRIMARY KEY (id),
  CONSTRAINT skud_cards_employee_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL,
  CONSTRAINT skud_cards_created_by_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT skud_cards_updated_by_fk FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT skud_cards_status_check CHECK (status IN ('active', 'blocked', 'unbound', 'revoked', 'lost')),
  CONSTRAINT skud_cards_number_unique UNIQUE (external_system, card_number_normalized)
);

CREATE INDEX IF NOT EXISTS idx_skud_cards_employee_id
  ON public.skud_cards USING btree (employee_id);

CREATE INDEX IF NOT EXISTS idx_skud_cards_status
  ON public.skud_cards USING btree (status);

CREATE TABLE IF NOT EXISTS public.skud_access_events (
  id bigserial NOT NULL,
  external_system character varying(32) NOT NULL DEFAULT 'sigur',
  source character varying(32) NOT NULL DEFAULT 'webdel',
  event_type character varying(32) NOT NULL DEFAULT 'passage',
  log_id bigint,
  employee_id uuid,
  external_emp_id character varying(128),
  access_point integer,
  direction integer,
  key_hex character varying(128),
  allow boolean,
  decision_message text,
  event_time timestamp with time zone NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT skud_access_events_pkey PRIMARY KEY (id),
  CONSTRAINT skud_access_events_employee_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_skud_access_events_external_source_log
  ON public.skud_access_events (external_system, source, log_id)
  WHERE log_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_skud_access_events_employee_time
  ON public.skud_access_events USING btree (employee_id, event_time DESC);

CREATE INDEX IF NOT EXISTS idx_skud_access_events_point_time
  ON public.skud_access_events USING btree (access_point, event_time DESC);

CREATE TABLE IF NOT EXISTS public.skud_sync_jobs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  external_system character varying(32) NOT NULL DEFAULT 'sigur',
  employee_id uuid,
  operation character varying(64) NOT NULL,
  status character varying(32) NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb,
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  processed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT skud_sync_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT skud_sync_jobs_employee_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL,
  CONSTRAINT skud_sync_jobs_created_by_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT skud_sync_jobs_status_check CHECK (status IN ('pending', 'processing', 'success', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_skud_sync_jobs_status_created
  ON public.skud_sync_jobs USING btree (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_skud_sync_jobs_employee_created
  ON public.skud_sync_jobs USING btree (employee_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.skud_qr_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  employee_id uuid NOT NULL,
  external_system character varying(32) NOT NULL DEFAULT 'sigur',
  jti character varying(128) NOT NULL,
  token_hash character varying(128) NOT NULL,
  token_type character varying(32) NOT NULL DEFAULT 'persistent',
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  issued_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT skud_qr_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT skud_qr_tokens_employee_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT skud_qr_tokens_issued_by_fk FOREIGN KEY (issued_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT skud_qr_tokens_type_check CHECK (token_type IN ('persistent', 'one_time')),
  CONSTRAINT skud_qr_tokens_jti_unique UNIQUE (external_system, jti),
  CONSTRAINT skud_qr_tokens_hash_unique UNIQUE (external_system, token_hash)
);

CREATE INDEX IF NOT EXISTS idx_skud_qr_tokens_employee_expiry
  ON public.skud_qr_tokens USING btree (employee_id, expires_at DESC);

COMMIT;

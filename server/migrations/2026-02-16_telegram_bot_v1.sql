BEGIN;

CREATE TABLE IF NOT EXISTS public.telegram_accounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  employee_id uuid NOT NULL,
  telegram_user_id character varying(32) NOT NULL,
  telegram_chat_id character varying(32) NOT NULL,
  telegram_username character varying(255),
  telegram_first_name character varying(255),
  telegram_last_name character varying(255),
  language character varying(5) NOT NULL DEFAULT 'ru',
  is_active boolean NOT NULL DEFAULT true,
  linked_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT telegram_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT telegram_accounts_employee_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT telegram_accounts_employee_unique UNIQUE (employee_id),
  CONSTRAINT telegram_accounts_user_unique UNIQUE (telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_accounts_chat_id
  ON public.telegram_accounts USING btree (telegram_chat_id);

CREATE INDEX IF NOT EXISTS idx_telegram_accounts_active
  ON public.telegram_accounts USING btree (is_active);

CREATE TABLE IF NOT EXISTS public.telegram_link_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  employee_id uuid NOT NULL,
  code character varying(32) NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  used_by_telegram_user_id character varying(32),
  created_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT telegram_link_codes_pkey PRIMARY KEY (id),
  CONSTRAINT telegram_link_codes_employee_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT telegram_link_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT telegram_link_codes_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_employee
  ON public.telegram_link_codes USING btree (employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_expires
  ON public.telegram_link_codes USING btree (expires_at);

CREATE TABLE IF NOT EXISTS public.telegram_command_logs (
  id bigserial NOT NULL,
  employee_id uuid,
  telegram_user_id character varying(32),
  telegram_chat_id character varying(32),
  command character varying(64) NOT NULL,
  status character varying(32) NOT NULL DEFAULT 'received',
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT telegram_command_logs_pkey PRIMARY KEY (id),
  CONSTRAINT telegram_command_logs_employee_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_telegram_command_logs_user_created
  ON public.telegram_command_logs USING btree (telegram_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_command_logs_command
  ON public.telegram_command_logs USING btree (command, created_at DESC);

CREATE TABLE IF NOT EXISTS public.telegram_notification_logs (
  id bigserial NOT NULL,
  employee_id uuid NOT NULL,
  event_type character varying(64) NOT NULL,
  event_key character varying(128) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT telegram_notification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT telegram_notification_logs_employee_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT telegram_notification_logs_unique UNIQUE (employee_id, event_type, event_key)
);

CREATE INDEX IF NOT EXISTS idx_telegram_notification_logs_event
  ON public.telegram_notification_logs USING btree (event_type, delivered_at DESC);

COMMIT;

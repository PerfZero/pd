CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  token_hash character varying(128) NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  replaced_by_token_id uuid,
  created_by_ip character varying(45),
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
  ON public.refresh_tokens USING btree (token_hash);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON public.refresh_tokens USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
  ON public.refresh_tokens USING btree (expires_at);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_changed_at timestamp with time zone;

BEGIN;

CREATE TABLE IF NOT EXISTS public.document_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code character varying(64) NOT NULL,
  name text NOT NULL,
  description text,
  sample_url text,
  sample_mime_type character varying(128),
  sample_highlighted_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT document_types_pkey PRIMARY KEY (id),
  CONSTRAINT document_types_code_key UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_document_types_active_sort
  ON public.document_types USING btree (is_active, sort_order);

INSERT INTO public.document_types (code, name, sort_order)
VALUES
  ('passport', 'Паспорт', 10),
  ('bank_details', 'Реквизиты счета', 20),
  ('kig', 'КИГ', 30),
  ('patent_front', 'Патент (лиц.)', 40),
  ('patent_back', 'Патент (спин.)', 50),
  ('biometric_consent', 'Согласие на перс.дан. Генподряд', 60),
  ('biometric_consent_developer', 'Согласие на перс.дан. Застройщ', 70),
  ('diploma', 'Диплом', 80),
  ('med_book', 'Мед.книжка', 90),
  ('migration_card', 'Миграционная карта', 100),
  ('arrival_notice', 'Уведомление о прибытии', 110),
  ('patent_payment_receipt', 'Чек оплаты патента', 120),
  ('mvd_notification', 'Уведомление МВД', 130)
ON CONFLICT (code) DO NOTHING;

COMMIT;

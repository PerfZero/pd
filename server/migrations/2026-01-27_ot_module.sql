-- OT module tables

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ot_document_status') THEN
    CREATE TYPE ot_document_status AS ENUM ('not_uploaded', 'uploaded', 'approved', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ot_contractor_status_enum') THEN
    CREATE TYPE ot_contractor_status_enum AS ENUM ('admitted', 'not_admitted', 'temp_admitted');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ot_comment_type') THEN
    CREATE TYPE ot_comment_type AS ENUM ('contractor', 'document');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ot_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  parent_id uuid,
  sort_order integer DEFAULT 0 NOT NULL,
  is_deleted boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ot_categories_pkey PRIMARY KEY (id),
  CONSTRAINT ot_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.ot_categories (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ot_categories_parent_id
  ON public.ot_categories USING btree (parent_id);

CREATE TABLE IF NOT EXISTS public.ot_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  category_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_required boolean DEFAULT false NOT NULL,
  template_file_id uuid,
  is_deleted boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ot_documents_pkey PRIMARY KEY (id),
  CONSTRAINT ot_documents_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.ot_categories (id) ON DELETE RESTRICT,
  CONSTRAINT ot_documents_template_file_id_fkey FOREIGN KEY (template_file_id) REFERENCES public.files (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ot_documents_category_id
  ON public.ot_documents USING btree (category_id);

CREATE INDEX IF NOT EXISTS idx_ot_documents_is_required
  ON public.ot_documents USING btree (is_required);

CREATE TABLE IF NOT EXISTS public.ot_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  file_id uuid NOT NULL,
  description text,
  is_deleted boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ot_templates_pkey PRIMARY KEY (id),
  CONSTRAINT ot_templates_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files (id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.ot_instructions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  text text,
  file_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ot_instructions_pkey PRIMARY KEY (id),
  CONSTRAINT ot_instructions_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.ot_contractor_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  document_id uuid NOT NULL,
  counterparty_id uuid NOT NULL,
  construction_site_id uuid NOT NULL,
  file_id uuid NOT NULL,
  status ot_document_status DEFAULT 'not_uploaded' NOT NULL,
  comment text,
  uploaded_by uuid NOT NULL,
  checked_by uuid,
  checked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ot_contractor_documents_pkey PRIMARY KEY (id),
  CONSTRAINT ot_contractor_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.ot_documents (id) ON DELETE CASCADE,
  CONSTRAINT ot_contractor_documents_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES public.counterparties (id) ON DELETE CASCADE,
  CONSTRAINT ot_contractor_documents_construction_site_id_fkey FOREIGN KEY (construction_site_id) REFERENCES public.construction_sites (id) ON DELETE CASCADE,
  CONSTRAINT ot_contractor_documents_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files (id) ON DELETE RESTRICT,
  CONSTRAINT ot_contractor_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users (id) ON DELETE RESTRICT,
  CONSTRAINT ot_contractor_documents_checked_by_fkey FOREIGN KEY (checked_by) REFERENCES public.users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ot_contractor_documents_unique
  ON public.ot_contractor_documents USING btree (document_id, counterparty_id, construction_site_id);

CREATE INDEX IF NOT EXISTS idx_ot_contractor_documents_status
  ON public.ot_contractor_documents USING btree (status);

CREATE TABLE IF NOT EXISTS public.ot_contractor_document_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  contractor_document_id uuid NOT NULL,
  status ot_document_status NOT NULL,
  comment text,
  changed_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ot_contractor_document_history_pkey PRIMARY KEY (id),
  CONSTRAINT ot_contractor_document_history_document_id_fkey FOREIGN KEY (contractor_document_id) REFERENCES public.ot_contractor_documents (id) ON DELETE CASCADE,
  CONSTRAINT ot_contractor_document_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ot_contractor_document_history_doc_id
  ON public.ot_contractor_document_history USING btree (contractor_document_id);

CREATE INDEX IF NOT EXISTS idx_ot_contractor_document_history_active
  ON public.ot_contractor_document_history USING btree (is_active);

CREATE TABLE IF NOT EXISTS public.ot_contractor_status (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  counterparty_id uuid NOT NULL,
  construction_site_id uuid NOT NULL,
  status ot_contractor_status_enum DEFAULT 'not_admitted' NOT NULL,
  is_manual boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ot_contractor_status_pkey PRIMARY KEY (id),
  CONSTRAINT ot_contractor_status_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES public.counterparties (id) ON DELETE CASCADE,
  CONSTRAINT ot_contractor_status_construction_site_id_fkey FOREIGN KEY (construction_site_id) REFERENCES public.construction_sites (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ot_contractor_status_unique
  ON public.ot_contractor_status USING btree (counterparty_id, construction_site_id);

CREATE INDEX IF NOT EXISTS idx_ot_contractor_status_status
  ON public.ot_contractor_status USING btree (status);

CREATE TABLE IF NOT EXISTS public.ot_contractor_status_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  counterparty_id uuid NOT NULL,
  construction_site_id uuid NOT NULL,
  status ot_contractor_status_enum NOT NULL,
  changed_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ot_contractor_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT ot_contractor_status_history_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES public.counterparties (id) ON DELETE CASCADE,
  CONSTRAINT ot_contractor_status_history_construction_site_id_fkey FOREIGN KEY (construction_site_id) REFERENCES public.construction_sites (id) ON DELETE CASCADE,
  CONSTRAINT ot_contractor_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ot_contractor_status_history_pair
  ON public.ot_contractor_status_history USING btree (counterparty_id, construction_site_id);

CREATE INDEX IF NOT EXISTS idx_ot_contractor_status_history_active
  ON public.ot_contractor_status_history USING btree (is_active);

CREATE TABLE IF NOT EXISTS public.ot_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  type ot_comment_type NOT NULL,
  counterparty_id uuid,
  construction_site_id uuid,
  contractor_document_id uuid,
  text text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ot_comments_pkey PRIMARY KEY (id),
  CONSTRAINT ot_comments_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES public.counterparties (id) ON DELETE SET NULL,
  CONSTRAINT ot_comments_construction_site_id_fkey FOREIGN KEY (construction_site_id) REFERENCES public.construction_sites (id) ON DELETE SET NULL,
  CONSTRAINT ot_comments_contractor_document_id_fkey FOREIGN KEY (contractor_document_id) REFERENCES public.ot_contractor_documents (id) ON DELETE SET NULL,
  CONSTRAINT ot_comments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ot_comments_type
  ON public.ot_comments USING btree (type);

CREATE INDEX IF NOT EXISTS idx_ot_comments_counterparty_site
  ON public.ot_comments USING btree (counterparty_id, construction_site_id);

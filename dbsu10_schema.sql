--
-- PostgreSQL database dump
--

\restrict jte3U9LADiUnICjGFBfEq3JlwiimhtemEGBntR9boFhCR2jav4brGp8n1RlwuPX

-- Dumped from database version 17.6 (Ubuntu 17.6-201-yandex.59659.b6403fb1f5)
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: admindb
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO admindb;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: admindb
--

COMMENT ON SCHEMA public IS '';


--
-- Name: document_type_enum; Type: TYPE; Schema: public; Owner: admindb
--

CREATE TYPE public.document_type_enum AS ENUM (
    'passport',
    'patent_front',
    'patent_back',
    'consent',
    'biometric_consent',
    'other',
    'application_scan',
    'bank_details',
    'kig',
    'diploma',
    'med_book',
    'migration_card',
    'arrival_notice',
    'patent_payment_receipt',
    'mvd_notification',
    'biometric_consent_developer'
);


ALTER TYPE public.document_type_enum OWNER TO admindb;

--
-- Name: TYPE document_type_enum; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TYPE public.document_type_enum IS 'Типы документов: passport, consent, bank_details, kig, patent_front, patent_back';


--
-- Name: employee_status_active; Type: TYPE; Schema: public; Owner: admindb
--

CREATE TYPE public.employee_status_active AS ENUM (
    'fired',
    'inactive',
    'fired_compl'
);


ALTER TYPE public.employee_status_active OWNER TO admindb;

--
-- Name: employee_status_secure; Type: TYPE; Schema: public; Owner: admindb
--

CREATE TYPE public.employee_status_secure AS ENUM (
    'allow',
    'block',
    'block_compl'
);


ALTER TYPE public.employee_status_secure OWNER TO admindb;

--
-- Name: enum_files_entity_type; Type: TYPE; Schema: public; Owner: admindb
--

CREATE TYPE public.enum_files_entity_type AS ENUM (
    'employee',
    'pass',
    'other',
    'application'
);


ALTER TYPE public.enum_files_entity_type OWNER TO admindb;

--
-- Name: enum_passes_pass_type; Type: TYPE; Schema: public; Owner: admindb
--

CREATE TYPE public.enum_passes_pass_type AS ENUM (
    'temporary',
    'permanent',
    'visitor',
    'contractor'
);


ALTER TYPE public.enum_passes_pass_type OWNER TO admindb;

--
-- Name: enum_passes_status; Type: TYPE; Schema: public; Owner: admindb
--

CREATE TYPE public.enum_passes_status AS ENUM (
    'active',
    'expired',
    'revoked',
    'pending'
);


ALTER TYPE public.enum_passes_status OWNER TO admindb;

--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: admindb
--

CREATE TYPE public.enum_users_role AS ENUM (
    'admin',
    'user'
);


ALTER TYPE public.enum_users_role OWNER TO admindb;

--
-- Name: enum_users_role_old; Type: TYPE; Schema: public; Owner: admindb
--

CREATE TYPE public.enum_users_role_old AS ENUM (
    'admin',
    'manager',
    'user'
);


ALTER TYPE public.enum_users_role_old OWNER TO admindb;

--
-- Name: generate_unique_registration_code(); Type: FUNCTION; Schema: public; Owner: admindb
--

CREATE FUNCTION public.generate_unique_registration_code() RETURNS character varying
    LANGUAGE plpgsql
    AS $$

DECLARE

    new_code VARCHAR(8);

    counter INTEGER := 0;

    max_attempts INTEGER := 1000;

BEGIN

    LOOP

        -- Генерация случайного 8-значного номера

        new_code := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');



        -- Проверка уникальности

        IF NOT EXISTS (SELECT 1 FROM counterparties WHERE registration_code = new_code) THEN

            RETURN new_code;

        END IF;



        counter := counter + 1;



        -- Защита от бесконечного цикла

        IF counter >= max_attempts THEN

            RAISE EXCEPTION 'Не удалось сгенерировать уникальный код регистрации после % попыток', max_attempts;

        END IF;

    END LOOP;

END;

$$;


ALTER FUNCTION public.generate_unique_registration_code() OWNER TO admindb;

--
-- Name: FUNCTION generate_unique_registration_code(); Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON FUNCTION public.generate_unique_registration_code() IS 'Генерация уникального 8-значного кода регистрации для контрагента';


--
-- Name: generate_unique_uin(); Type: FUNCTION; Schema: public; Owner: admindb
--

CREATE FUNCTION public.generate_unique_uin() RETURNS character varying
    LANGUAGE plpgsql
    AS $$

DECLARE

    new_uin VARCHAR(6);

    counter INTEGER := 0;

    max_attempts INTEGER := 1000;

BEGIN

    LOOP

        -- Генерация случайного 6-значного номера

        new_uin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');



        -- Проверка уникальности

        IF NOT EXISTS (SELECT 1 FROM users WHERE identification_number = new_uin) THEN

            RETURN new_uin;

        END IF;



        counter := counter + 1;



        -- Защита от бесконечного цикла

        IF counter >= max_attempts THEN

            RAISE EXCEPTION 'Не удалось сгенерировать уникальный УИН после % попыток', max_attempts;

        END IF;

    END LOOP;

END;

$$;


ALTER FUNCTION public.generate_unique_uin() OWNER TO admindb;

--
-- Name: FUNCTION generate_unique_uin(); Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON FUNCTION public.generate_unique_uin() IS 'Генерация уникального 6-значного идентификационного номера (УИН)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: admindb
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

  NEW.updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO admindb;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: application_employees_mapping; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.application_employees_mapping (
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    application_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE public.application_employees_mapping OWNER TO admindb;

--
-- Name: TABLE application_employees_mapping; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.application_employees_mapping IS 'Связь между заявками и сотрудниками (many-to-many mapping)';


--
-- Name: COLUMN application_employees_mapping.created_at; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.application_employees_mapping.created_at IS 'Когда сотрудник был добавлен в заявку';


--
-- Name: application_files_mapping; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.application_files_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    file_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.application_files_mapping OWNER TO admindb;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_number character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    counterparty_id uuid NOT NULL,
    construction_site_id uuid,
    subcontract_id uuid,
    created_by uuid NOT NULL,
    updated_by uuid,
    application_type character varying(20) NOT NULL,
    pass_valid_until date,
    CONSTRAINT applications_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('submitted'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text]))),
    CONSTRAINT applications_type_check CHECK (((application_type)::text = ANY (ARRAY[('biometric'::character varying)::text, ('customer'::character varying)::text])))
);


ALTER TABLE public.applications OWNER TO admindb;

--
-- Name: TABLE applications; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.applications IS 'Заявки на пропуска';


--
-- Name: COLUMN applications.application_number; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.applications.application_number IS 'Уникальный номер заявки (генерируется автоматически)';


--
-- Name: COLUMN applications.status; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.applications.status IS 'Статус: draft (черновик), submitted (подана), approved (одобрена), rejected (отклонена)';


--
-- Name: COLUMN applications.construction_site_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.applications.construction_site_id IS 'Объект строительства (необязательно)';


--
-- Name: COLUMN applications.pass_valid_until; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.applications.pass_valid_until IS 'Дата окончания действия пропусков';


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    status character varying(20) DEFAULT 'success'::character varying NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_logs_status_check CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'partial'::character varying])::text[])))
);


ALTER TABLE public.audit_logs OWNER TO admindb;

--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.audit_logs IS 'Логи критических действий пользователей для расследования инцидентов безопасности';


--
-- Name: COLUMN audit_logs.id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.audit_logs.id IS 'Уникальный идентификатор записи в audit log';


--
-- Name: COLUMN audit_logs.user_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.audit_logs.user_id IS 'ID пользователя, выполнившего действие';


--
-- Name: COLUMN audit_logs.action; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.audit_logs.action IS 'Тип действия (EMPLOYEE_IMPORT_START, EMPLOYEE_IMPORT_COMPLETE, и т.д.)';


--
-- Name: COLUMN audit_logs.entity_type; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.audit_logs.entity_type IS 'Тип сущности (employee, user, application)';


--
-- Name: COLUMN audit_logs.entity_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.audit_logs.entity_id IS 'ID затронутой сущности';


--
-- Name: COLUMN audit_logs.details; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.audit_logs.details IS 'Дополнительная информация о действии (JSON)';


--
-- Name: COLUMN audit_logs.ip_address; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.audit_logs.ip_address IS 'IP адрес пользователя';


--
-- Name: COLUMN audit_logs.user_agent; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.audit_logs.user_agent IS 'User-Agent браузера';


--
-- Name: COLUMN audit_logs.status; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.audit_logs.status IS 'Статус выполнения действия (success, failed, partial)';


--
-- Name: COLUMN audit_logs.error_message; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.audit_logs.error_message IS 'Сообщение об ошибке (если status = failed)';


--
-- Name: COLUMN audit_logs.created_at; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.audit_logs.created_at IS 'Дата и время создания записи';


--
-- Name: citizenship_synonyms; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.citizenship_synonyms (
    id integer NOT NULL,
    citizenship_id uuid NOT NULL,
    synonym character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.citizenship_synonyms OWNER TO admindb;

--
-- Name: TABLE citizenship_synonyms; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.citizenship_synonyms IS 'Синонимы гражданств для импорта данных';


--
-- Name: COLUMN citizenship_synonyms.citizenship_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.citizenship_synonyms.citizenship_id IS 'ID гражданства (UUID)';


--
-- Name: COLUMN citizenship_synonyms.synonym; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.citizenship_synonyms.synonym IS 'Синоним названия гражданства';


--
-- Name: citizenship_synonyms_id_seq; Type: SEQUENCE; Schema: public; Owner: admindb
--

CREATE SEQUENCE public.citizenship_synonyms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.citizenship_synonyms_id_seq OWNER TO admindb;

--
-- Name: citizenship_synonyms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admindb
--

ALTER SEQUENCE public.citizenship_synonyms_id_seq OWNED BY public.citizenship_synonyms.id;


--
-- Name: citizenships; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.citizenships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(10),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    requires_patent boolean DEFAULT true NOT NULL
);


ALTER TABLE public.citizenships OWNER TO admindb;

--
-- Name: TABLE citizenships; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.citizenships IS 'Справочник гражданств';


--
-- Name: COLUMN citizenships.name; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.citizenships.name IS 'Название гражданства';


--
-- Name: COLUMN citizenships.code; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.citizenships.code IS 'Код страны (ISO 3166-1 alpha-2)';


--
-- Name: COLUMN citizenships.requires_patent; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.citizenships.requires_patent IS 'Требуется ли патент для данного гражданства (по умолчанию true)';


--
-- Name: construction_sites; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.construction_sites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    short_name character varying(100) NOT NULL,
    full_name character varying(500) NOT NULL,
    address text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.construction_sites OWNER TO admindb;

--
-- Name: TABLE construction_sites; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.construction_sites IS 'Объекты строительства';


--
-- Name: COLUMN construction_sites.short_name; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.construction_sites.short_name IS 'Краткое название объекта';


--
-- Name: COLUMN construction_sites.full_name; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.construction_sites.full_name IS 'Полное название объекта';


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_number character varying(100) NOT NULL,
    contract_date date NOT NULL,
    type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    construction_site_id uuid NOT NULL,
    counterparty1_id uuid NOT NULL,
    counterparty2_id uuid NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT contracts_type_check CHECK (((type)::text = ANY (ARRAY[('subcontract'::character varying)::text, ('general_contract'::character varying)::text])))
);


ALTER TABLE public.contracts OWNER TO admindb;

--
-- Name: TABLE contracts; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.contracts IS 'Договоры между контрагентами';


--
-- Name: COLUMN contracts.type; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.contracts.type IS 'Тип договора: subcontract (договор подряда), general_contract (договор генподряда)';


--
-- Name: counterparties; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.counterparties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    inn character varying(12) NOT NULL,
    kpp character varying(9),
    ogrn character varying(15),
    legal_address text,
    phone character varying(20),
    email character varying(255),
    type character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid,
    registration_code character varying(8),
    CONSTRAINT counterparties_type_check CHECK (((type)::text = ANY (ARRAY[('customer'::character varying)::text, ('contractor'::character varying)::text, ('general_contractor'::character varying)::text])))
);


ALTER TABLE public.counterparties OWNER TO admindb;

--
-- Name: TABLE counterparties; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.counterparties IS 'Контрагенты: заказчики, подрядчики, владелец';


--
-- Name: COLUMN counterparties.inn; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.counterparties.inn IS 'ИНН - 10 или 12 цифр';


--
-- Name: COLUMN counterparties.kpp; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.counterparties.kpp IS 'КПП - 9 цифр';


--
-- Name: COLUMN counterparties.ogrn; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.counterparties.ogrn IS 'ОГРН - 13 или 15 цифр';


--
-- Name: COLUMN counterparties.type; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.counterparties.type IS 'DEPRECATED: Используется для обратной совместимости. Новая логика использует counterparties_types_mapping';


--
-- Name: COLUMN counterparties.registration_code; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.counterparties.registration_code IS 'Уникальный код для регистрации новых пользователей контрагента (8 цифр)';


--
-- Name: counterparties_subcounterparties_mapping; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.counterparties_subcounterparties_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_counterparty_id uuid NOT NULL,
    child_counterparty_id uuid NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_parent_not_child CHECK ((parent_counterparty_id <> child_counterparty_id))
);


ALTER TABLE public.counterparties_subcounterparties_mapping OWNER TO admindb;

--
-- Name: TABLE counterparties_subcounterparties_mapping; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.counterparties_subcounterparties_mapping IS 'Таблица связей между контрагентами (родитель создает субподрядчика)';


--
-- Name: COLUMN counterparties_subcounterparties_mapping.parent_counterparty_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.counterparties_subcounterparties_mapping.parent_counterparty_id IS 'ID контрагента-создателя (родитель)';


--
-- Name: COLUMN counterparties_subcounterparties_mapping.child_counterparty_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.counterparties_subcounterparties_mapping.child_counterparty_id IS 'ID субподрядчика (ребенок)';


--
-- Name: COLUMN counterparties_subcounterparties_mapping.created_by; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.counterparties_subcounterparties_mapping.created_by IS 'ID пользователя, создавшего связь';


--
-- Name: counterparties_types_mapping; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.counterparties_types_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    counterparty_id uuid NOT NULL,
    types jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_types_is_array CHECK ((jsonb_typeof(types) = 'array'::text))
);


ALTER TABLE public.counterparties_types_mapping OWNER TO admindb;

--
-- Name: TABLE counterparties_types_mapping; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.counterparties_types_mapping IS 'Таблица маппинга типов контрагентов (может быть несколько типов одновременно)';


--
-- Name: COLUMN counterparties_types_mapping.counterparty_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.counterparties_types_mapping.counterparty_id IS 'ID контрагента (уникальный)';


--
-- Name: COLUMN counterparties_types_mapping.types; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.counterparties_types_mapping.types IS 'JSONB массив типов: customer, contractor, general_contractor, subcontractor';


--
-- Name: counterparty_construction_sites_mapping; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.counterparty_construction_sites_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    counterparty_id uuid NOT NULL,
    construction_site_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.counterparty_construction_sites_mapping OWNER TO admindb;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    counterparty_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    construction_site_id uuid
);


ALTER TABLE public.departments OWNER TO admindb;

--
-- Name: TABLE departments; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.departments IS 'Подразделения контрагентов';


--
-- Name: COLUMN departments.id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.departments.id IS 'Уникальный идентификатор подразделения';


--
-- Name: COLUMN departments.name; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.departments.name IS 'Название подразделения';


--
-- Name: COLUMN departments.counterparty_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.departments.counterparty_id IS 'ID контрагента, к которому относится подразделение';


--
-- Name: employee_counterparty_mapping; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.employee_counterparty_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    counterparty_id uuid NOT NULL,
    department_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    construction_site_id uuid
);


ALTER TABLE public.employee_counterparty_mapping OWNER TO admindb;

--
-- Name: TABLE employee_counterparty_mapping; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.employee_counterparty_mapping IS 'Связь между сотрудниками, контрагентами и подразделениями';


--
-- Name: COLUMN employee_counterparty_mapping.employee_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employee_counterparty_mapping.employee_id IS 'ID сотрудника';


--
-- Name: COLUMN employee_counterparty_mapping.counterparty_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employee_counterparty_mapping.counterparty_id IS 'ID контрагента';


--
-- Name: COLUMN employee_counterparty_mapping.department_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employee_counterparty_mapping.department_id IS 'ID подразделения (может быть NULL)';


--
-- Name: COLUMN employee_counterparty_mapping.construction_site_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employee_counterparty_mapping.construction_site_id IS 'ID объекта строительства (опционально)';


--
-- Name: employees; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name character varying(255),
    last_name character varying(255) NOT NULL,
    middle_name character varying(255),
    email character varying(255),
    phone character varying(255),
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    birth_date date,
    passport_number character varying(50),
    passport_date date,
    passport_issuer text,
    registration_address text,
    patent_number character varying(50),
    patent_issue_date date,
    blank_number character varying(50),
    inn character varying(12),
    snils character varying(14),
    kig character varying(50),
    citizenship_id uuid,
    created_by uuid NOT NULL,
    updated_by uuid,
    position_id uuid,
    kig_end_date date,
    passport_type character varying(20),
    passport_expiry_date date,
    gender character varying(10),
    birth_country_id uuid,
    id_all uuid,
    CONSTRAINT check_gender_values CHECK (((gender)::text = ANY (ARRAY[('male'::character varying)::text, ('female'::character varying)::text])))
);


ALTER TABLE public.employees OWNER TO admindb;

--
-- Name: COLUMN employees.first_name; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.first_name IS 'Имя сотрудника (может быть NULL для черновиков)';


--
-- Name: COLUMN employees.birth_date; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.birth_date IS 'Дата рождения';


--
-- Name: COLUMN employees.passport_number; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.passport_number IS 'Номер паспорта';


--
-- Name: COLUMN employees.passport_date; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.passport_date IS 'Дата выдачи паспорта';


--
-- Name: COLUMN employees.passport_issuer; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.passport_issuer IS 'Кем выдан паспорт';


--
-- Name: COLUMN employees.registration_address; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.registration_address IS 'Адрес регистрации';


--
-- Name: COLUMN employees.patent_number; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.patent_number IS 'Номер патента (для иностранных граждан)';


--
-- Name: COLUMN employees.patent_issue_date; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.patent_issue_date IS 'Дата выдачи патента';


--
-- Name: COLUMN employees.blank_number; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.blank_number IS 'Серия и номер бланка документа';


--
-- Name: COLUMN employees.inn; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.inn IS 'ИНН сотрудника (10 или 12 цифр)';


--
-- Name: COLUMN employees.snils; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.snils IS 'СНИЛС сотрудника (XXX-XXX-XXX XX)';


--
-- Name: COLUMN employees.kig; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.kig IS 'КИГ (Карта иностранного гражданина)';


--
-- Name: COLUMN employees.created_by; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.created_by IS 'ID пользователя, создавшего запись (обязательное поле)';


--
-- Name: COLUMN employees.position_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.position_id IS 'Должность сотрудника (внешний ключ на positions)';


--
-- Name: COLUMN employees.kig_end_date; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.kig_end_date IS 'Дата окончания действия Карты иностранного гражданина (КИГ)';


--
-- Name: COLUMN employees.passport_type; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.passport_type IS 'Тип паспорта: russian (Российский) или foreign (Иностранного гражданина)';


--
-- Name: COLUMN employees.passport_expiry_date; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees.passport_expiry_date IS 'Дата окончания действия иностранного паспорта';


--
-- Name: employees_statuses_mapping; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.employees_statuses_mapping (
    employee_id uuid NOT NULL,
    status_id integer NOT NULL,
    status_group character varying(50) NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT false,
    is_upload boolean DEFAULT false NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE public.employees_statuses_mapping OWNER TO admindb;

--
-- Name: TABLE employees_statuses_mapping; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.employees_statuses_mapping IS 'Маппинг между сотрудниками и их статусами по группам';


--
-- Name: COLUMN employees_statuses_mapping.status_group; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees_statuses_mapping.status_group IS 'Группа статуса для быстрого поиска и индексирования';


--
-- Name: COLUMN employees_statuses_mapping.is_active; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees_statuses_mapping.is_active IS 'Только один активный статус для каждой группы сотрудника';


--
-- Name: COLUMN employees_statuses_mapping.is_upload; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.employees_statuses_mapping.is_upload IS 'Флаг для отслеживания загрузки в ЗУП (true - загружено, false - не загружено)';


--
-- Name: excel_column_sets; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.excel_column_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    counterparty_id uuid NOT NULL,
    columns jsonb NOT NULL,
    is_default boolean DEFAULT false,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.excel_column_sets OWNER TO admindb;

--
-- Name: TABLE excel_column_sets; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.excel_column_sets IS 'Наборы столбцов для экспорта сотрудников в Excel. Каждый набор принадлежит контрагенту и доступен всем его пользователям.';


--
-- Name: COLUMN excel_column_sets.name; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.excel_column_sets.name IS 'Название набора столбцов';


--
-- Name: COLUMN excel_column_sets.counterparty_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.excel_column_sets.counterparty_id IS 'ID контрагента-владельца набора';


--
-- Name: COLUMN excel_column_sets.columns; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.excel_column_sets.columns IS 'Массив объектов с информацией о столбцах: ключ, название, активность, порядок';


--
-- Name: COLUMN excel_column_sets.is_default; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.excel_column_sets.is_default IS 'Флаг набора по умолчанию для контрагента';


--
-- Name: COLUMN excel_column_sets.created_by; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.excel_column_sets.created_by IS 'ID пользователя, создавшего набор';


--
-- Name: COLUMN excel_column_sets.updated_by; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.excel_column_sets.updated_by IS 'ID пользователя, последним редактировавшего набор';


--
-- Name: files; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_key character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    mime_type character varying(255) NOT NULL,
    file_size integer NOT NULL,
    file_path character varying(255) NOT NULL,
    public_url character varying(255),
    resource_id character varying(255),
    entity_type enum_files_entity_type,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    entity_id uuid,
    uploaded_by uuid,
    employee_id uuid,
    document_type document_type_enum
);


ALTER TABLE public.files OWNER TO admindb;

--
-- Name: COLUMN files.file_key; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.files.file_key IS 'Ключ файла на Яндекс.Диске';


--
-- Name: COLUMN files.file_size; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.files.file_size IS 'Размер файла в байтах';


--
-- Name: COLUMN files.file_path; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.files.file_path IS 'Полный путь на Яндекс.Диске';


--
-- Name: COLUMN files.public_url; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.files.public_url IS 'Публичная ссылка на файл';


--
-- Name: COLUMN files.resource_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.files.resource_id IS 'Resource ID от Яндекс.Диска';


--
-- Name: COLUMN files.entity_type; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.files.entity_type IS 'Тип связанной сущности: employee, pass, application, other';


--
-- Name: COLUMN files.document_type; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.files.document_type IS 'Тип документа: passport (Паспорт), patent_front (Лицевая сторона патента), patent_back (Задняя сторона патента), biometric_consent (Согласие на обработку биометрических данных), application_scan (Скан заявки), other (Другое)';


--
-- Name: passes; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.passes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pass_number character varying(255),
    pass_type enum_passes_pass_type DEFAULT 'temporary'::enum_passes_pass_type NOT NULL,
    valid_from timestamp with time zone NOT NULL,
    valid_until timestamp with time zone NOT NULL,
    access_zones character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
    status enum_passes_status DEFAULT 'pending'::enum_passes_status NOT NULL,
    qr_code text,
    document_file_key character varying(255),
    document_file_url character varying(255),
    notes text,
    revoked_at timestamp with time zone,
    revoke_reason text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    employee_id uuid NOT NULL,
    issued_by uuid,
    revoked_by uuid
);


ALTER TABLE public.passes OWNER TO admindb;

--
-- Name: COLUMN passes.pass_number; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.passes.pass_number IS 'Уникальный номер пропуска';


--
-- Name: COLUMN passes.access_zones; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.passes.access_zones IS 'Массив зон доступа, например: ["building_a", "floor_1", "office_101"]';


--
-- Name: COLUMN passes.qr_code; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.passes.qr_code IS 'QR код для сканирования';


--
-- Name: COLUMN passes.document_file_key; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.passes.document_file_key IS 'Ключ файла документа на Яндекс.Диске';


--
-- Name: COLUMN passes.document_file_url; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.passes.document_file_url IS 'URL файла документа';


--
-- Name: positions; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.positions OWNER TO admindb;

--
-- Name: TABLE positions; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.positions IS 'Справочник должностей сотрудников';


--
-- Name: COLUMN positions.id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.positions.id IS 'Уникальный идентификатор должности';


--
-- Name: COLUMN positions.name; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.positions.name IS 'Название должности (уникальное)';


--
-- Name: COLUMN positions.created_by; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.positions.created_by IS 'Пользователь, создавший запись';


--
-- Name: COLUMN positions.updated_by; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.positions.updated_by IS 'Пользователь, последним обновивший запись';


--
-- Name: COLUMN positions.created_at; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.positions.created_at IS 'Дата и время создания записи';


--
-- Name: COLUMN positions.updated_at; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.positions.updated_at IS 'Дата и время последнего обновления записи';


--
-- Name: settings; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.settings OWNER TO admindb;

--
-- Name: TABLE settings; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.settings IS 'Глобальные настройки системы';


--
-- Name: COLUMN settings.key; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.settings.key IS 'Уникальный ключ настройки';


--
-- Name: COLUMN settings.value; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.settings.value IS 'Значение настройки (сериализованное)';


--
-- Name: COLUMN settings.description; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.settings.description IS 'Описание настройки';


--
-- Name: statuses; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.statuses (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    "group" character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.statuses OWNER TO admindb;

--
-- Name: TABLE statuses; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.statuses IS 'Справочник всех статусов для сотрудников';


--
-- Name: COLUMN statuses.name; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.statuses.name IS 'Имя статуса в формате группа_значение (например: status_new, status_card_draft)';


--
-- Name: COLUMN statuses."group"; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.statuses."group" IS 'Группа статуса: status, status_card, status_active, status_secure';


--
-- Name: statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: admindb
--

CREATE SEQUENCE public.statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statuses_id_seq OWNER TO admindb;

--
-- Name: statuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admindb
--

ALTER SEQUENCE public.statuses_id_seq OWNED BY public.statuses.id;


--
-- Name: user_employee_mapping; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.user_employee_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    counterparty_id uuid
);


ALTER TABLE public.user_employee_mapping OWNER TO admindb;

--
-- Name: TABLE user_employee_mapping; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.user_employee_mapping IS 'Связь между пользователями системы и сотрудниками';


--
-- Name: COLUMN user_employee_mapping.user_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.user_employee_mapping.user_id IS 'ID пользователя';


--
-- Name: COLUMN user_employee_mapping.employee_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.user_employee_mapping.employee_id IS 'ID сотрудника';


--
-- Name: COLUMN user_employee_mapping.counterparty_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.user_employee_mapping.counterparty_id IS 'ID контрагента для быстрой фильтрации (NULL для контрагента по умолчанию)';


--
-- Name: users; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255),
    role enum_users_role_old DEFAULT 'user'::enum_users_role_old NOT NULL,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    counterparty_id uuid,
    identification_number character varying(6)
);


ALTER TABLE public.users OWNER TO admindb;

--
-- Name: COLUMN users.last_name; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.users.last_name IS 'Фамилия пользователя (может быть NULL, так как ФИО хранится в first_name)';


--
-- Name: COLUMN users.identification_number; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.users.identification_number IS 'Уникальный идентификационный номер (УИН) пользователя в формате xxxxxx (6 цифр)';


--
-- Name: citizenship_synonyms id; Type: DEFAULT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.citizenship_synonyms ALTER COLUMN id SET DEFAULT nextval('citizenship_synonyms_id_seq'::regclass);


--
-- Name: statuses id; Type: DEFAULT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.statuses ALTER COLUMN id SET DEFAULT nextval('statuses_id_seq'::regclass);


--
-- Name: application_employees_mapping application_employees_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.application_employees_mapping
    ADD CONSTRAINT application_employees_mapping_pkey PRIMARY KEY (id);


--
-- Name: application_files_mapping application_files_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.application_files_mapping
    ADD CONSTRAINT application_files_mapping_pkey PRIMARY KEY (id);


--
-- Name: applications applications_application_number_key; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_application_number_key UNIQUE (application_number);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: citizenship_synonyms citizenship_synonyms_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.citizenship_synonyms
    ADD CONSTRAINT citizenship_synonyms_pkey PRIMARY KEY (id);


--
-- Name: citizenships citizenships_name_key; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.citizenships
    ADD CONSTRAINT citizenships_name_key UNIQUE (name);


--
-- Name: citizenships citizenships_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.citizenships
    ADD CONSTRAINT citizenships_pkey PRIMARY KEY (id);


--
-- Name: construction_sites construction_sites_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.construction_sites
    ADD CONSTRAINT construction_sites_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: counterparties counterparties_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparties
    ADD CONSTRAINT counterparties_pkey PRIMARY KEY (id);


--
-- Name: counterparties counterparties_registration_code_key; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparties
    ADD CONSTRAINT counterparties_registration_code_key UNIQUE (registration_code);


--
-- Name: counterparties_subcounterparties_mapping counterparties_subcounterparties_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparties_subcounterparties_mapping
    ADD CONSTRAINT counterparties_subcounterparties_mapping_pkey PRIMARY KEY (id);


--
-- Name: counterparties_types_mapping counterparties_types_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparties_types_mapping
    ADD CONSTRAINT counterparties_types_mapping_pkey PRIMARY KEY (id);


--
-- Name: counterparty_construction_sites_mapping counterparty_construction_sit_counterparty_id_construction__key; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparty_construction_sites_mapping
    ADD CONSTRAINT counterparty_construction_sit_counterparty_id_construction__key UNIQUE (counterparty_id, construction_site_id);


--
-- Name: counterparty_construction_sites_mapping counterparty_construction_sites_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparty_construction_sites_mapping
    ADD CONSTRAINT counterparty_construction_sites_mapping_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: employee_counterparty_mapping employee_counterparty_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employee_counterparty_mapping
    ADD CONSTRAINT employee_counterparty_mapping_pkey PRIMARY KEY (id);


--
-- Name: employees employees_id_all_key; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_id_all_key UNIQUE (id_all);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: employees_statuses_mapping employees_statuses_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employees_statuses_mapping
    ADD CONSTRAINT employees_statuses_mapping_pkey PRIMARY KEY (id);


--
-- Name: excel_column_sets excel_column_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.excel_column_sets
    ADD CONSTRAINT excel_column_sets_pkey PRIMARY KEY (id);


--
-- Name: files files_file_key_key; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_file_key_key UNIQUE (file_key);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: counterparties_types_mapping idx_counterparty_types_mapping_counterparty_id; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparties_types_mapping
    ADD CONSTRAINT idx_counterparty_types_mapping_counterparty_id UNIQUE (counterparty_id);


--
-- Name: passes passes_pass_number_key; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.passes
    ADD CONSTRAINT passes_pass_number_key UNIQUE (pass_number);


--
-- Name: passes passes_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.passes
    ADD CONSTRAINT passes_pkey PRIMARY KEY (id);


--
-- Name: positions positions_name_key; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_name_key UNIQUE (name);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: statuses statuses_name_key; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_name_key UNIQUE (name);


--
-- Name: statuses statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_pkey PRIMARY KEY (id);


--
-- Name: excel_column_sets uk_excel_column_sets_name_counterparty; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.excel_column_sets
    ADD CONSTRAINT uk_excel_column_sets_name_counterparty UNIQUE (name, counterparty_id);


--
-- Name: application_files_mapping unique_application_file; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.application_files_mapping
    ADD CONSTRAINT unique_application_file UNIQUE (application_id, file_id);


--
-- Name: citizenship_synonyms unique_citizenship_synonym; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.citizenship_synonyms
    ADD CONSTRAINT unique_citizenship_synonym UNIQUE (citizenship_id, synonym);


--
-- Name: departments unique_department_name_per_counterparty; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT unique_department_name_per_counterparty UNIQUE (name, counterparty_id);


--
-- Name: counterparties_subcounterparties_mapping unique_parent_child_pair; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparties_subcounterparties_mapping
    ADD CONSTRAINT unique_parent_child_pair UNIQUE (parent_counterparty_id, child_counterparty_id);


--
-- Name: user_employee_mapping unique_user_employee; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.user_employee_mapping
    ADD CONSTRAINT unique_user_employee UNIQUE (user_id, employee_id);


--
-- Name: user_employee_mapping user_employee_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.user_employee_mapping
    ADD CONSTRAINT user_employee_mapping_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_email_key1; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key1 UNIQUE (email);


--
-- Name: users users_email_key2; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key2 UNIQUE (email);


--
-- Name: users users_email_key3; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key3 UNIQUE (email);


--
-- Name: users users_identification_number_key; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_identification_number_key UNIQUE (identification_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: employees_inn_unique; Type: INDEX; Schema: public; Owner: admindb
--

CREATE UNIQUE INDEX employees_inn_unique ON public.employees USING btree (inn) WHERE ((inn IS NOT NULL) AND ((inn)::text <> ''::text));


--
-- Name: employees_is_active; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX employees_is_active ON public.employees USING btree (is_active);


--
-- Name: employees_kig_unique; Type: INDEX; Schema: public; Owner: admindb
--

CREATE UNIQUE INDEX employees_kig_unique ON public.employees USING btree (kig) WHERE ((kig IS NOT NULL) AND ((kig)::text <> ''::text));


--
-- Name: employees_passport_number_unique; Type: INDEX; Schema: public; Owner: admindb
--

CREATE UNIQUE INDEX employees_passport_number_unique ON public.employees USING btree (passport_number) WHERE ((passport_number IS NOT NULL) AND ((passport_number)::text <> ''::text));


--
-- Name: employees_snils_unique; Type: INDEX; Schema: public; Owner: admindb
--

CREATE UNIQUE INDEX employees_snils_unique ON public.employees USING btree (snils) WHERE ((snils IS NOT NULL) AND ((snils)::text <> ''::text));


--
-- Name: employees_statuses_mapping_active_unique; Type: INDEX; Schema: public; Owner: admindb
--

CREATE UNIQUE INDEX employees_statuses_mapping_active_unique ON public.employees_statuses_mapping USING btree (employee_id, status_group) WHERE (is_active = true);


--
-- Name: employees_statuses_mapping_employee_id_idx; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX employees_statuses_mapping_employee_id_idx ON public.employees_statuses_mapping USING btree (employee_id);


--
-- Name: employees_statuses_mapping_status_group_idx; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX employees_statuses_mapping_status_group_idx ON public.employees_statuses_mapping USING btree (status_group);


--
-- Name: employees_statuses_mapping_status_id_idx; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX employees_statuses_mapping_status_id_idx ON public.employees_statuses_mapping USING btree (status_id);


--
-- Name: files_file_key; Type: INDEX; Schema: public; Owner: admindb
--

CREATE UNIQUE INDEX files_file_key ON public.files USING btree (file_key);


--
-- Name: idx_application_employees_mapping_application_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_application_employees_mapping_application_id ON public.application_employees_mapping USING btree (application_id);


--
-- Name: idx_application_employees_mapping_employee_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_application_employees_mapping_employee_id ON public.application_employees_mapping USING btree (employee_id);


--
-- Name: idx_application_employees_mapping_unique; Type: INDEX; Schema: public; Owner: admindb
--

CREATE UNIQUE INDEX idx_application_employees_mapping_unique ON public.application_employees_mapping USING btree (application_id, employee_id);


--
-- Name: idx_application_files_application; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_application_files_application ON public.application_files_mapping USING btree (application_id);


--
-- Name: idx_application_files_employee; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_application_files_employee ON public.application_files_mapping USING btree (employee_id);


--
-- Name: idx_application_files_file; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_application_files_file ON public.application_files_mapping USING btree (file_id);


--
-- Name: idx_applications_created_at; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_applications_created_at ON public.applications USING btree (created_at);


--
-- Name: idx_applications_status; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_applications_status ON public.applications USING btree (status);


--
-- Name: idx_applications_type; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_applications_type ON public.applications USING btree (application_type);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id) WHERE (entity_type IS NOT NULL);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_ccm_construction_site_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_ccm_construction_site_id ON public.counterparty_construction_sites_mapping USING btree (construction_site_id);


--
-- Name: idx_ccm_counterparty_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_ccm_counterparty_id ON public.counterparty_construction_sites_mapping USING btree (counterparty_id);


--
-- Name: idx_citizenship_synonyms_citizenship_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_citizenship_synonyms_citizenship_id ON public.citizenship_synonyms USING btree (citizenship_id);


--
-- Name: idx_citizenship_synonyms_synonym; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_citizenship_synonyms_synonym ON public.citizenship_synonyms USING btree (synonym);


--
-- Name: idx_citizenships_name; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_citizenships_name ON public.citizenships USING btree (name);


--
-- Name: idx_citizenships_requires_patent; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_citizenships_requires_patent ON public.citizenships USING btree (requires_patent);


--
-- Name: idx_construction_sites_short_name; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_construction_sites_short_name ON public.construction_sites USING btree (short_name);


--
-- Name: idx_contracts_number; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_contracts_number ON public.contracts USING btree (contract_number);


--
-- Name: idx_counterparties_inn; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_counterparties_inn ON public.counterparties USING btree (inn);


--
-- Name: idx_counterparties_registration_code; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_counterparties_registration_code ON public.counterparties USING btree (registration_code);


--
-- Name: idx_counterparties_type; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_counterparties_type ON public.counterparties USING btree (type);


--
-- Name: idx_counterparties_types_mapping_types; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_counterparties_types_mapping_types ON public.counterparties_types_mapping USING gin (types);


--
-- Name: idx_counterparty_construction_mapping_counterparty; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_counterparty_construction_mapping_counterparty ON public.counterparty_construction_sites_mapping USING btree (counterparty_id);


--
-- Name: idx_counterparty_construction_mapping_site; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_counterparty_construction_mapping_site ON public.counterparty_construction_sites_mapping USING btree (construction_site_id);


--
-- Name: idx_counterparty_subcounterparty_child; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_counterparty_subcounterparty_child ON public.counterparties_subcounterparties_mapping USING btree (child_counterparty_id);


--
-- Name: idx_counterparty_subcounterparty_parent; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_counterparty_subcounterparty_parent ON public.counterparties_subcounterparties_mapping USING btree (parent_counterparty_id);


--
-- Name: idx_departments_construction_site_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_departments_construction_site_id ON public.departments USING btree (construction_site_id);


--
-- Name: idx_departments_counterparty_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_departments_counterparty_id ON public.departments USING btree (counterparty_id);


--
-- Name: idx_emp_cp_mapping_counterparty_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_emp_cp_mapping_counterparty_id ON public.employee_counterparty_mapping USING btree (counterparty_id);


--
-- Name: idx_emp_cp_mapping_department_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_emp_cp_mapping_department_id ON public.employee_counterparty_mapping USING btree (department_id);


--
-- Name: idx_emp_cp_mapping_employee_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_emp_cp_mapping_employee_id ON public.employee_counterparty_mapping USING btree (employee_id);


--
-- Name: idx_employees_birth_country_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_employees_birth_country_id ON public.employees USING btree (birth_country_id);


--
-- Name: idx_employees_id_all; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_employees_id_all ON public.employees USING btree (id_all);


--
-- Name: idx_employees_inn; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_employees_inn ON public.employees USING btree (inn);


--
-- Name: idx_employees_kig; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_employees_kig ON public.employees USING btree (kig);


--
-- Name: idx_employees_position_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_employees_position_id ON public.employees USING btree (position_id);


--
-- Name: idx_employees_snils; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_employees_snils ON public.employees USING btree (snils);


--
-- Name: idx_excel_column_sets_counterparty_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_excel_column_sets_counterparty_id ON public.excel_column_sets USING btree (counterparty_id);


--
-- Name: idx_excel_column_sets_created_by; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_excel_column_sets_created_by ON public.excel_column_sets USING btree (created_by);


--
-- Name: idx_excel_column_sets_is_default; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_excel_column_sets_is_default ON public.excel_column_sets USING btree (counterparty_id, is_default) WHERE (is_default = true);


--
-- Name: idx_files_document_type; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_files_document_type ON public.files USING btree (document_type);


--
-- Name: idx_files_employee_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_files_employee_id ON public.files USING btree (employee_id);


--
-- Name: idx_positions_name; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_positions_name ON public.positions USING btree (name);


--
-- Name: idx_settings_key; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_settings_key ON public.settings USING btree (key);


--
-- Name: idx_user_employee_mapping_counterparty; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_user_employee_mapping_counterparty ON public.user_employee_mapping USING btree (counterparty_id);


--
-- Name: idx_user_employee_mapping_employee; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_user_employee_mapping_employee ON public.user_employee_mapping USING btree (employee_id);


--
-- Name: idx_user_employee_mapping_user; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_user_employee_mapping_user ON public.user_employee_mapping USING btree (user_id);


--
-- Name: idx_users_identification_number; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_users_identification_number ON public.users USING btree (identification_number);


--
-- Name: passes_pass_number; Type: INDEX; Schema: public; Owner: admindb
--

CREATE UNIQUE INDEX passes_pass_number ON public.passes USING btree (pass_number);


--
-- Name: passes_status; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX passes_status ON public.passes USING btree (status);


--
-- Name: passes_valid_from_valid_until; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX passes_valid_from_valid_until ON public.passes USING btree (valid_from, valid_until);


--
-- Name: unique_employee_counterparty_site_mapping; Type: INDEX; Schema: public; Owner: admindb
--

CREATE UNIQUE INDEX unique_employee_counterparty_site_mapping ON public.employee_counterparty_mapping USING btree (employee_id, counterparty_id, COALESCE(construction_site_id, '00000000-0000-0000-0000-000000000000'::uuid));


--
-- Name: applications update_applications_updated_at; Type: TRIGGER; Schema: public; Owner: admindb
--

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


--
-- Name: citizenships update_citizenships_updated_at; Type: TRIGGER; Schema: public; Owner: admindb
--

CREATE TRIGGER update_citizenships_updated_at BEFORE UPDATE ON public.citizenships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


--
-- Name: construction_sites update_construction_sites_updated_at; Type: TRIGGER; Schema: public; Owner: admindb
--

CREATE TRIGGER update_construction_sites_updated_at BEFORE UPDATE ON public.construction_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


--
-- Name: contracts update_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: admindb
--

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


--
-- Name: counterparties update_counterparties_updated_at; Type: TRIGGER; Schema: public; Owner: admindb
--

CREATE TRIGGER update_counterparties_updated_at BEFORE UPDATE ON public.counterparties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


--
-- Name: counterparty_construction_sites_mapping update_counterparty_construction_sites_mapping_updated_at; Type: TRIGGER; Schema: public; Owner: admindb
--

CREATE TRIGGER update_counterparty_construction_sites_mapping_updated_at BEFORE UPDATE ON public.counterparty_construction_sites_mapping FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


--
-- Name: application_employees_mapping application_employees_mapping_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.application_employees_mapping
    ADD CONSTRAINT application_employees_mapping_application_id_fkey FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;


--
-- Name: application_employees_mapping application_employees_mapping_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.application_employees_mapping
    ADD CONSTRAINT application_employees_mapping_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;


--
-- Name: application_files_mapping application_files_mapping_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.application_files_mapping
    ADD CONSTRAINT application_files_mapping_application_id_fkey FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;


--
-- Name: application_files_mapping application_files_mapping_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.application_files_mapping
    ADD CONSTRAINT application_files_mapping_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;


--
-- Name: application_files_mapping application_files_mapping_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.application_files_mapping
    ADD CONSTRAINT application_files_mapping_file_id_fkey FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE;


--
-- Name: applications applications_construction_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_construction_site_id_fkey FOREIGN KEY (construction_site_id) REFERENCES construction_sites(id) ON DELETE CASCADE;


--
-- Name: applications applications_counterparty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES counterparties(id) ON DELETE CASCADE;


--
-- Name: applications applications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: applications applications_subcontract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_subcontract_id_fkey FOREIGN KEY (subcontract_id) REFERENCES contracts(id) ON DELETE SET NULL;


--
-- Name: applications applications_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: construction_sites construction_sites_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.construction_sites
    ADD CONSTRAINT construction_sites_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: construction_sites construction_sites_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.construction_sites
    ADD CONSTRAINT construction_sites_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_construction_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_construction_site_id_fkey FOREIGN KEY (construction_site_id) REFERENCES construction_sites(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_counterparty1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_counterparty1_id_fkey FOREIGN KEY (counterparty1_id) REFERENCES counterparties(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_counterparty2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_counterparty2_id_fkey FOREIGN KEY (counterparty2_id) REFERENCES counterparties(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: counterparties counterparties_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparties
    ADD CONSTRAINT counterparties_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: counterparties counterparties_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparties
    ADD CONSTRAINT counterparties_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: counterparty_construction_sites_mapping counterparty_construction_sites_mappi_construction_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparty_construction_sites_mapping
    ADD CONSTRAINT counterparty_construction_sites_mappi_construction_site_id_fkey FOREIGN KEY (construction_site_id) REFERENCES construction_sites(id) ON DELETE CASCADE;


--
-- Name: counterparty_construction_sites_mapping counterparty_construction_sites_mapping_counterparty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparty_construction_sites_mapping
    ADD CONSTRAINT counterparty_construction_sites_mapping_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES counterparties(id) ON DELETE CASCADE;


--
-- Name: employees employees_birth_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_birth_country_id_fkey FOREIGN KEY (birth_country_id) REFERENCES citizenships(id) ON DELETE SET NULL;


--
-- Name: employees employees_citizenship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_citizenship_id_fkey FOREIGN KEY (citizenship_id) REFERENCES citizenships(id) ON DELETE SET NULL;


--
-- Name: employees employees_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: employees employees_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_position_id_fkey FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL;


--
-- Name: employees_statuses_mapping employees_statuses_mapping_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employees_statuses_mapping
    ADD CONSTRAINT employees_statuses_mapping_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);


--
-- Name: employees_statuses_mapping employees_statuses_mapping_employee_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employees_statuses_mapping
    ADD CONSTRAINT employees_statuses_mapping_employee_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;


--
-- Name: employees_statuses_mapping employees_statuses_mapping_status_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employees_statuses_mapping
    ADD CONSTRAINT employees_statuses_mapping_status_fkey FOREIGN KEY (status_id) REFERENCES statuses(id);


--
-- Name: employees_statuses_mapping employees_statuses_mapping_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employees_statuses_mapping
    ADD CONSTRAINT employees_statuses_mapping_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id);


--
-- Name: employees employees_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: files files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: citizenship_synonyms fk_citizenship_synonym_citizenship; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.citizenship_synonyms
    ADD CONSTRAINT fk_citizenship_synonym_citizenship FOREIGN KEY (citizenship_id) REFERENCES citizenships(id) ON DELETE CASCADE;


--
-- Name: counterparties_subcounterparties_mapping fk_counterparty_subcounterparty_child; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparties_subcounterparties_mapping
    ADD CONSTRAINT fk_counterparty_subcounterparty_child FOREIGN KEY (child_counterparty_id) REFERENCES counterparties(id) ON DELETE CASCADE;


--
-- Name: counterparties_subcounterparties_mapping fk_counterparty_subcounterparty_created_by; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparties_subcounterparties_mapping
    ADD CONSTRAINT fk_counterparty_subcounterparty_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: counterparties_subcounterparties_mapping fk_counterparty_subcounterparty_parent; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparties_subcounterparties_mapping
    ADD CONSTRAINT fk_counterparty_subcounterparty_parent FOREIGN KEY (parent_counterparty_id) REFERENCES counterparties(id) ON DELETE CASCADE;


--
-- Name: counterparties_types_mapping fk_counterparty_types_mapping_counterparty; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.counterparties_types_mapping
    ADD CONSTRAINT fk_counterparty_types_mapping_counterparty FOREIGN KEY (counterparty_id) REFERENCES counterparties(id) ON DELETE CASCADE;


--
-- Name: departments fk_department_counterparty; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT fk_department_counterparty FOREIGN KEY (counterparty_id) REFERENCES counterparties(id) ON DELETE CASCADE;


--
-- Name: departments fk_departments_construction_site; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT fk_departments_construction_site FOREIGN KEY (construction_site_id) REFERENCES construction_sites(id) ON DELETE SET NULL;


--
-- Name: employee_counterparty_mapping fk_ecm_construction_site; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employee_counterparty_mapping
    ADD CONSTRAINT fk_ecm_construction_site FOREIGN KEY (construction_site_id) REFERENCES construction_sites(id) ON DELETE SET NULL;


--
-- Name: excel_column_sets fk_excel_column_sets_counterparty; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.excel_column_sets
    ADD CONSTRAINT fk_excel_column_sets_counterparty FOREIGN KEY (counterparty_id) REFERENCES counterparties(id) ON DELETE CASCADE;


--
-- Name: excel_column_sets fk_excel_column_sets_created_by; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.excel_column_sets
    ADD CONSTRAINT fk_excel_column_sets_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: excel_column_sets fk_excel_column_sets_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.excel_column_sets
    ADD CONSTRAINT fk_excel_column_sets_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: files fk_files_employee; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT fk_files_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;


--
-- Name: employee_counterparty_mapping fk_mapping_counterparty; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employee_counterparty_mapping
    ADD CONSTRAINT fk_mapping_counterparty FOREIGN KEY (counterparty_id) REFERENCES counterparties(id) ON DELETE CASCADE;


--
-- Name: employee_counterparty_mapping fk_mapping_department; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employee_counterparty_mapping
    ADD CONSTRAINT fk_mapping_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;


--
-- Name: employee_counterparty_mapping fk_mapping_employee; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.employee_counterparty_mapping
    ADD CONSTRAINT fk_mapping_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;


--
-- Name: user_employee_mapping fk_user_employee_mapping_counterparty; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.user_employee_mapping
    ADD CONSTRAINT fk_user_employee_mapping_counterparty FOREIGN KEY (counterparty_id) REFERENCES counterparties(id) ON DELETE SET NULL;


--
-- Name: passes passes_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.passes
    ADD CONSTRAINT passes_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;


--
-- Name: passes passes_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.passes
    ADD CONSTRAINT passes_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: passes passes_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.passes
    ADD CONSTRAINT passes_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: positions positions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: positions positions_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: user_employee_mapping user_employee_mapping_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.user_employee_mapping
    ADD CONSTRAINT user_employee_mapping_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;


--
-- Name: user_employee_mapping user_employee_mapping_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.user_employee_mapping
    ADD CONSTRAINT user_employee_mapping_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: users users_counterparty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admindb
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES counterparties(id) ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: admindb
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- Name: FUNCTION pg_replication_origin_advance(text, pg_lsn); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_advance(text, pg_lsn) TO mdb_replication;


--
-- Name: FUNCTION pg_replication_origin_create(text); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_create(text) TO mdb_replication;


--
-- Name: FUNCTION pg_replication_origin_drop(text); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_drop(text) TO mdb_replication;


--
-- Name: FUNCTION pg_replication_origin_oid(text); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_oid(text) TO mdb_replication;


--
-- Name: FUNCTION pg_replication_origin_progress(text, boolean); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_progress(text, boolean) TO mdb_replication;


--
-- Name: FUNCTION pg_replication_origin_session_reset(); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_session_reset() TO mdb_replication;


--
-- Name: FUNCTION pg_replication_origin_session_setup(text); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_session_setup(text) TO mdb_replication;


--
-- Name: FUNCTION pg_replication_origin_xact_reset(); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_xact_reset() TO mdb_replication;


--
-- Name: FUNCTION pg_replication_origin_xact_setup(pg_lsn, timestamp with time zone); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_xact_setup(pg_lsn, timestamp with time zone) TO mdb_replication;


--
-- Name: FUNCTION pg_stat_reset(); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_stat_reset() TO mdb_admin;


--
-- Name: FUNCTION pg_stat_reset_shared(target text); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_stat_reset_shared(target text) TO mdb_admin;


--
-- Name: FUNCTION pg_stat_reset_single_function_counters(oid); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_stat_reset_single_function_counters(oid) TO mdb_admin;


--
-- Name: FUNCTION pg_stat_reset_single_table_counters(oid); Type: ACL; Schema: pg_catalog; Owner: postgres
--

GRANT ALL ON FUNCTION pg_catalog.pg_stat_reset_single_table_counters(oid) TO mdb_admin;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO admindb WITH GRANT OPTION;


--
-- Name: unauthorized_access_logs; Type: TABLE; Schema: public; Owner: admindb
--

CREATE TABLE public.unauthorized_access_logs (
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

ALTER TABLE public.unauthorized_access_logs OWNER TO admindb;

--
-- Name: TABLE unauthorized_access_logs; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON TABLE public.unauthorized_access_logs IS 'Логи попыток несанкционированного доступа (401/403)';

--
-- Name: COLUMN unauthorized_access_logs.user_id; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.unauthorized_access_logs.user_id IS 'ID пользователя (если удалось определить)';

--
-- Name: COLUMN unauthorized_access_logs.status_code; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.unauthorized_access_logs.status_code IS 'HTTP статус (401/403)';

--
-- Name: COLUMN unauthorized_access_logs.path; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.unauthorized_access_logs.path IS 'Запрошенный путь';

--
-- Name: COLUMN unauthorized_access_logs.details; Type: COMMENT; Schema: public; Owner: admindb
--

COMMENT ON COLUMN public.unauthorized_access_logs.details IS 'Дополнительные детали запроса (JSON)';

--
-- Name: idx_unauth_logs_user_id; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_unauth_logs_user_id ON public.unauthorized_access_logs USING btree (user_id);

--
-- Name: idx_unauth_logs_status_code; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_unauth_logs_status_code ON public.unauthorized_access_logs USING btree (status_code);

--
-- Name: idx_unauth_logs_created_at; Type: INDEX; Schema: public; Owner: admindb
--

CREATE INDEX idx_unauth_logs_created_at ON public.unauthorized_access_logs USING btree (created_at);


--
-- PostgreSQL database dump complete
--

\unrestrict jte3U9LADiUnICjGFBfEq3JlwiimhtemEGBntR9boFhCR2jav4brGp8n1RlwuPX

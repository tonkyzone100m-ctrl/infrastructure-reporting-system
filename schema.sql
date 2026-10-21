--
-- PostgreSQL database dump
--

\restrict B9UGkwa7abTdFjCKRPGpR2cDzfyf7aD3Nobp6ZSs4vgu8sGOuTEyvetFkGjEqol

-- Dumped from database version 18.4 (Debian 18.4-1)
-- Dumped by pg_dump version 18.4 (Debian 18.4-1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    actor_id bigint,
    action character varying(120) NOT NULL,
    entity_type character varying(40) NOT NULL,
    entity_id bigint,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id bigint NOT NULL,
    name character varying(120) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: report_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_comments (
    id bigint NOT NULL,
    report_id bigint NOT NULL,
    user_id bigint,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT report_comments_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000)))
);


--
-- Name: report_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_comments_id_seq OWNED BY public.report_comments.id;


--
-- Name: report_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_evidence (
    id bigint NOT NULL,
    report_id bigint NOT NULL,
    file_name character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    mime_type character varying(120) NOT NULL,
    size_bytes bigint NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT report_evidence_size_bytes_check CHECK ((size_bytes > 0))
);


--
-- Name: report_evidence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_evidence_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_evidence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_evidence_id_seq OWNED BY public.report_evidence.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id bigint NOT NULL,
    reference character varying(24) GENERATED ALWAYS AS (('RH-'::text || lpad((id)::text, 6, '0'::text))) STORED,
    title character varying(180) NOT NULL,
    category character varying(80) NOT NULL,
    description text NOT NULL,
    location character varying(255) NOT NULL,
    latitude numeric(10,7),
    longitude numeric(10,7),
    user_id bigint,
    evidence_name character varying(255),
    evidence_data bytea,
    status character varying(30) DEFAULT 'Received'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    priority character varying(20) DEFAULT 'Medium'::character varying NOT NULL,
    department_id bigint,
    assigned_to bigint,
    sla_deadline timestamp with time zone,
    is_overdue boolean DEFAULT false NOT NULL,
    CONSTRAINT reports_priority_check CHECK (((priority)::text = ANY ((ARRAY['Low'::character varying, 'Medium'::character varying, 'High'::character varying, 'Critical'::character varying])::text[]))),
    CONSTRAINT reports_status_check CHECK (((status)::text = ANY (ARRAY[('Received'::character varying)::text, ('In progress'::character varying)::text, ('Resolved'::character varying)::text])))
);


--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(120) NOT NULL,
    email character varying(190) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) DEFAULT 'citizen'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    department_id bigint,
    role_full character varying(30),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['citizen'::character varying, 'admin'::character varying, 'super_admin'::character varying, 'department_manager'::character varying, 'field_staff'::character varying, 'auditor'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: report_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments ALTER COLUMN id SET DEFAULT nextval('public.report_comments_id_seq'::regclass);


--
-- Name: report_evidence id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_evidence ALTER COLUMN id SET DEFAULT nextval('public.report_evidence_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: report_comments report_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments
    ADD CONSTRAINT report_comments_pkey PRIMARY KEY (id);


--
-- Name: report_evidence report_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_evidence
    ADD CONSTRAINT report_evidence_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: reports reports_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reference_key UNIQUE (reference);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_log_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_created_at_idx ON public.audit_log USING btree (created_at DESC);


--
-- Name: report_comments_report_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX report_comments_report_idx ON public.report_comments USING btree (report_id, created_at);


--
-- Name: report_evidence_report_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX report_evidence_report_id_idx ON public.report_evidence USING btree (report_id);


--
-- Name: reports_assigned_to_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_assigned_to_idx ON public.reports USING btree (assigned_to);


--
-- Name: reports_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_created_at_idx ON public.reports USING btree (created_at DESC);


--
-- Name: reports_department_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_department_idx ON public.reports USING btree (department_id);


--
-- Name: reports_overdue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_overdue_idx ON public.reports USING btree (is_overdue);


--
-- Name: reports_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_priority_idx ON public.reports USING btree (priority);


--
-- Name: reports_sla_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_sla_idx ON public.reports USING btree (sla_deadline);


--
-- Name: reports_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_status_idx ON public.reports USING btree (status);


--
-- Name: audit_log audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: report_comments report_comments_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments
    ADD CONSTRAINT report_comments_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: report_comments report_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments
    ADD CONSTRAINT report_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: report_evidence report_evidence_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_evidence
    ADD CONSTRAINT report_evidence_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports reports_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reports reports_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: reports reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict B9UGkwa7abTdFjCKRPGpR2cDzfyf7aD3Nobp6ZSs4vgu8sGOuTEyvetFkGjEqol


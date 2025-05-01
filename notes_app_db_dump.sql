--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

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

DROP DATABASE notes_app_db;
--
-- Name: notes_app_db; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE notes_app_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en-US';


ALTER DATABASE notes_app_db OWNER TO postgres;

\connect notes_app_db

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notes (
    id integer NOT NULL,
    user_id integer,
    title character varying(255) NOT NULL,
    content text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notes OWNER TO postgres;

--
-- Name: notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notes_id_seq OWNER TO postgres;

--
-- Name: notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notes_id_seq OWNED BY public.notes.id;


--
-- Name: trashed_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trashed_notes (
    id integer NOT NULL,
    note_id integer,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    trashed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    original_updated_at timestamp with time zone
);


ALTER TABLE public.trashed_notes OWNER TO postgres;

--
-- Name: trashed_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trashed_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trashed_notes_id_seq OWNER TO postgres;

--
-- Name: trashed_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trashed_notes_id_seq OWNED BY public.trashed_notes.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notes ALTER COLUMN id SET DEFAULT nextval('public.notes_id_seq'::regclass);


--
-- Name: trashed_notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trashed_notes ALTER COLUMN id SET DEFAULT nextval('public.trashed_notes_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notes (id, user_id, title, content, updated_at) FROM stdin;
1	1	My First Note	This is a test note.	2025-03-17 14:59:45.898215
106	3	test-1	test-1	2025-03-29 13:27:57.761816
107	3	test-2	test-2	2025-03-29 13:28:08.189983
108	3	test3	test3	2025-03-29 13:28:18.490967
109	3	test-4	test-4	2025-03-29 13:48:22.73531
305	2	hey	<h1>hey</h1><p><code> code</code></p><p></p>	2025-04-17 13:52:04.062026
96	3	N	N	2025-03-22 13:41:30.203
332	2	hey	<p>hey</p>	2025-04-30 13:19:59.2964
45	3	test delete	test delete	2025-03-26 13:04:26.246149
46	5	hello	hello	2025-03-26 13:52:57.440471
\.


--
-- Data for Name: trashed_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trashed_notes (id, note_id, user_id, title, content, trashed_at, original_updated_at) FROM stdin;
1	47	5	test delete 2	test delete 2	2025-03-26 15:10:58.49452+05:30	\N
309	327	2	line	<ul class="list-disc pl-5"><li><p>line</p></li><li><p>linner</p></li></ul>	2025-04-30 12:28:08.068755+05:30	2025-04-15 16:28:26.609+05:30
310	301	2	<p></p><pre><code>code</code></pre>	<p></p><pre><code>code</code></pre>	2025-04-30 12:39:10.087848+05:30	2025-04-14 18:23:44.687+05:30
311	330	2	hey therehe	<p>hey there<br>he </p><p></p><p>                    </p>	2025-04-30 13:20:02.023511+05:30	2025-04-27 18:06:49.594+05:30
86	23	3	new test line	new test line	2025-03-29 13:30:08.352242+05:30	2025-03-22 13:57:34.251+05:30
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password) FROM stdin;
1	testuser	hashedpassword123
2	testuser3	$2b$10$7PJhF63QBkCGVicSlBWdbOPaYoLxObaEi1u9Q0X1nkrH3t6759Mh6
3	testuser5	$2b$10$3oartBNgkpfhyp/IUkyLUupsCmGBpheIK7JK4tzdS4zxvgF0/m7xa
4	suviuser	$2b$10$LjLUVobPO1h0hOO1aDLPUO2YtgSvEqsvcIYDMt2iIkQJ9YpQi4jVe
5	testuser1	$2b$10$/o6o9GM0jRqoyQKB2wKY0eehrYtR3bOcwGam8iHdL.s3JjK0418/2
\.


--
-- Name: notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notes_id_seq', 332, true);


--
-- Name: trashed_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trashed_notes_id_seq', 311, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: trashed_notes trashed_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trashed_notes
    ADD CONSTRAINT trashed_notes_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: trashed_notes fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trashed_notes
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notes notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--


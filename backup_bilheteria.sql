--
-- PostgreSQL database dump
--

\restrict RakKkfx9ces7UqMqG7EAdf6qB8jJqeje9BSMdd02i9OU4BsnXd9a9b19nj8nF3L

-- Dumped from database version 16.16 (Debian 16.16-1.pgdg13+1)
-- Dumped by pg_dump version 16.16 (Debian 16.16-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: canal_venda; Type: TYPE; Schema: public; Owner: bilheteria
--

CREATE TYPE public.canal_venda AS ENUM (
    'INTERNET',
    'BALCAO'
);


ALTER TYPE public.canal_venda OWNER TO bilheteria;

--
-- Name: perfil_usuario; Type: TYPE; Schema: public; Owner: bilheteria
--

CREATE TYPE public.perfil_usuario AS ENUM (
    'CLIENTE',
    'OPERADOR'
);


ALTER TYPE public.perfil_usuario OWNER TO bilheteria;

--
-- Name: situacao_reserva; Type: TYPE; Schema: public; Owner: bilheteria
--

CREATE TYPE public.situacao_reserva AS ENUM (
    'PENDENTE',
    'PAGA',
    'EXPIRADA'
);


ALTER TYPE public.situacao_reserva OWNER TO bilheteria;

--
-- Name: tipo_evento; Type: TYPE; Schema: public; Owner: bilheteria
--

CREATE TYPE public.tipo_evento AS ENUM (
    'FILME',
    'EVENTO'
);


ALTER TYPE public.tipo_evento OWNER TO bilheteria;

--
-- Name: fn_auditar_ingresso(); Type: FUNCTION; Schema: public; Owner: bilheteria
--

CREATE FUNCTION public.fn_auditar_ingresso() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.auditorias_ingressos (ingresso_id, acao, uso_atual_em, responsavel_id)
    VALUES (NEW.id, 'INSERCAO', NEW.utilizado_em, NEW.validado_por_id);
  ELSIF OLD.utilizado_em IS DISTINCT FROM NEW.utilizado_em THEN
    INSERT INTO public.auditorias_ingressos (ingresso_id, acao, uso_anterior_em, uso_atual_em, responsavel_id)
    VALUES (NEW.id, 'ATUALIZACAO', OLD.utilizado_em, NEW.utilizado_em, NEW.validado_por_id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_auditar_ingresso() OWNER TO bilheteria;

--
-- Name: sp_relatorio_sessoes(timestamp with time zone, timestamp with time zone, uuid, jsonb); Type: PROCEDURE; Schema: public; Owner: bilheteria
--

CREATE PROCEDURE public.sp_relatorio_sessoes(IN p_inicio timestamp with time zone, IN p_fim timestamp with time zone, IN p_sessao uuid, INOUT resultado jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
  WITH capacidade AS (
    SELECT sessao_id, count(*)::integer AS capacidade FROM public.assentos_sessao GROUP BY sessao_id
  ), vendas AS (
    SELECT item.sessao_id, count(ingresso.id)::integer AS vendidos,
      count(ingresso.utilizado_em)::integer AS utilizados, sum(item.preco_unitario) AS receita
    FROM public.ingressos ingresso
    JOIN public.itens_reserva item ON item.id=ingresso.item_reserva_id
    JOIN public.reservas reserva ON reserva.id=item.reserva_id
    JOIN public.pagamentos pagamento ON pagamento.reserva_id=reserva.id
    GROUP BY item.sessao_id
  ), linhas AS (
    SELECT sessao.id AS "sessaoId", evento.titulo, sala.nome AS sala, sessao.inicio_em AS "inicioEm",
      coalesce(capacidade.capacidade,0) AS capacidade, coalesce(vendas.vendidos,0) AS vendidos,
      coalesce(vendas.utilizados,0) AS utilizados, coalesce(vendas.receita,0)::numeric(12,2)::text AS receita,
      CASE WHEN coalesce(capacidade.capacidade,0)=0 THEN 0
        ELSE round(coalesce(vendas.vendidos,0)::numeric/capacidade.capacidade*100,2) END AS "taxaOcupacao"
    FROM public.sessoes sessao
    JOIN public.eventos evento ON evento.id=sessao.evento_id
    JOIN public.salas sala ON sala.id=sessao.sala_id
    LEFT JOIN capacidade ON capacidade.sessao_id=sessao.id
    LEFT JOIN vendas ON vendas.sessao_id=sessao.id
    WHERE (p_inicio IS NULL OR sessao.inicio_em>=p_inicio)
      AND (p_fim IS NULL OR sessao.inicio_em<=p_fim)
      AND (p_sessao IS NULL OR sessao.id=p_sessao)
  ) SELECT coalesce(jsonb_agg(to_jsonb(linhas) ORDER BY "inicioEm"),'[]'::jsonb) INTO resultado FROM linhas;
END;
$$;


ALTER PROCEDURE public.sp_relatorio_sessoes(IN p_inicio timestamp with time zone, IN p_fim timestamp with time zone, IN p_sessao uuid, INOUT resultado jsonb) OWNER TO bilheteria;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: bilheteria
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO bilheteria;

--
-- Name: assentos; Type: TABLE; Schema: public; Owner: bilheteria
--

CREATE TABLE public.assentos (
    id uuid NOT NULL,
    sala_id uuid NOT NULL,
    fila text NOT NULL,
    numero integer NOT NULL,
    CONSTRAINT ck_assentos_numero_positivo CHECK ((numero > 0))
);


ALTER TABLE public.assentos OWNER TO bilheteria;

--
-- Name: assentos_sessao; Type: TABLE; Schema: public; Owner: bilheteria
--

CREATE TABLE public.assentos_sessao (
    id uuid NOT NULL,
    sessao_id uuid NOT NULL,
    assento_id uuid NOT NULL,
    sala_id uuid NOT NULL,
    reserva_atual_id uuid
);


ALTER TABLE public.assentos_sessao OWNER TO bilheteria;

--
-- Name: auditorias_ingressos; Type: TABLE; Schema: public; Owner: bilheteria
--

CREATE TABLE public.auditorias_ingressos (
    id bigint NOT NULL,
    ingresso_id uuid NOT NULL,
    acao text NOT NULL,
    registrado_em timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    uso_anterior_em timestamp(3) with time zone,
    uso_atual_em timestamp(3) with time zone,
    responsavel_id uuid
);


ALTER TABLE public.auditorias_ingressos OWNER TO bilheteria;

--
-- Name: auditorias_ingressos_id_seq; Type: SEQUENCE; Schema: public; Owner: bilheteria
--

CREATE SEQUENCE public.auditorias_ingressos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auditorias_ingressos_id_seq OWNER TO bilheteria;

--
-- Name: auditorias_ingressos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bilheteria
--

ALTER SEQUENCE public.auditorias_ingressos_id_seq OWNED BY public.auditorias_ingressos.id;


--
-- Name: eventos; Type: TABLE; Schema: public; Owner: bilheteria
--

CREATE TABLE public.eventos (
    id uuid NOT NULL,
    titulo text NOT NULL,
    descricao text DEFAULT ''::text NOT NULL,
    tipo public.tipo_evento NOT NULL
);


ALTER TABLE public.eventos OWNER TO bilheteria;

--
-- Name: ingressos; Type: TABLE; Schema: public; Owner: bilheteria
--

CREATE TABLE public.ingressos (
    id uuid NOT NULL,
    item_reserva_id uuid NOT NULL,
    assento_sessao_id uuid NOT NULL,
    codigo text NOT NULL,
    emitido_em timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    utilizado_em timestamp(3) with time zone,
    validado_por_id uuid
);


ALTER TABLE public.ingressos OWNER TO bilheteria;

--
-- Name: itens_reserva; Type: TABLE; Schema: public; Owner: bilheteria
--

CREATE TABLE public.itens_reserva (
    id uuid NOT NULL,
    reserva_id uuid NOT NULL,
    assento_sessao_id uuid NOT NULL,
    sessao_id uuid NOT NULL,
    preco_unitario numeric(12,2) NOT NULL,
    CONSTRAINT ck_itens_reserva_preco_unitario_nao_negativo CHECK ((preco_unitario >= (0)::numeric))
);


ALTER TABLE public.itens_reserva OWNER TO bilheteria;

--
-- Name: pagamentos; Type: TABLE; Schema: public; Owner: bilheteria
--

CREATE TABLE public.pagamentos (
    id uuid NOT NULL,
    reserva_id uuid NOT NULL,
    valor numeric(12,2) NOT NULL,
    pago_em timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    simulado boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_pagamentos_valor_nao_negativo CHECK ((valor >= (0)::numeric))
);


ALTER TABLE public.pagamentos OWNER TO bilheteria;

--
-- Name: reservas; Type: TABLE; Schema: public; Owner: bilheteria
--

CREATE TABLE public.reservas (
    id uuid NOT NULL,
    sessao_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    situacao public.situacao_reserva DEFAULT 'PENDENTE'::public.situacao_reserva NOT NULL,
    canal_venda public.canal_venda DEFAULT 'INTERNET'::public.canal_venda NOT NULL,
    expira_em timestamp(3) with time zone NOT NULL,
    valor_total numeric(12,2) NOT NULL,
    criado_em timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_reservas_valor_total_nao_negativo CHECK ((valor_total >= (0)::numeric))
);


ALTER TABLE public.reservas OWNER TO bilheteria;

--
-- Name: salas; Type: TABLE; Schema: public; Owner: bilheteria
--

CREATE TABLE public.salas (
    id uuid NOT NULL,
    nome text NOT NULL
);


ALTER TABLE public.salas OWNER TO bilheteria;

--
-- Name: sessoes; Type: TABLE; Schema: public; Owner: bilheteria
--

CREATE TABLE public.sessoes (
    id uuid NOT NULL,
    evento_id uuid NOT NULL,
    sala_id uuid NOT NULL,
    inicio_em timestamp(3) with time zone NOT NULL,
    preco numeric(12,2) NOT NULL,
    CONSTRAINT ck_sessoes_preco_nao_negativo CHECK ((preco >= (0)::numeric))
);


ALTER TABLE public.sessoes OWNER TO bilheteria;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: bilheteria
--

CREATE TABLE public.usuarios (
    id uuid NOT NULL,
    nome text NOT NULL,
    email text NOT NULL,
    hash_senha text NOT NULL,
    perfil public.perfil_usuario DEFAULT 'CLIENTE'::public.perfil_usuario NOT NULL,
    criado_em timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.usuarios OWNER TO bilheteria;

--
-- Name: auditorias_ingressos id; Type: DEFAULT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.auditorias_ingressos ALTER COLUMN id SET DEFAULT nextval('public.auditorias_ingressos_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: bilheteria
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
a4e5fbfe-3716-40b5-845c-f67febe70f18	14167f662b70f9d0cd0d8aeb27b23361a01ffd4b3716a8c3f0fe637ade57d4a1	2026-11-20 15:26:01.711654+00	202610260001_init	\N	\N	2026-11-20 15:26:01.17935+00	1
252e932d-15e1-4397-a684-eec80cdfbed9	bb27b610160ec3318d9c03654564751a9c506f6c6b6604c25a3101d68306c387	2026-11-20 15:26:01.770395+00	202610260002_sql	\N	\N	2026-11-20 15:26:01.719133+00	1
2dc75f0e-49a7-4db2-b0d2-6208927a8fe1	595dc8f999096082ca0c57fa9b3aef329963a3503833d99293aadc24dfe890a9	2026-11-20 15:26:01.934703+00	202611030001_padronizacao_portugues	\N	\N	2026-11-20 15:26:01.772522+00	1
\.


--
-- Data for Name: assentos; Type: TABLE DATA; Schema: public; Owner: bilheteria
--

COPY public.assentos (id, sala_id, fila, numero) FROM stdin;
4818d945-0b5d-4e5e-9d38-aa1083179558	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	A	1
5be8b673-876c-4eb6-b2ae-1e1361438544	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	A	2
5636c129-c617-4f15-8cf1-2049e3860dcb	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	A	3
9a63bf0e-babc-400d-9311-3f2fade7ab74	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	B	1
fe5a55f2-ec0a-4471-b331-c96becd85c88	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	B	2
47efcee5-c6c2-4fae-a155-4cdd7fd0e4a1	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	B	3
0d5d6f97-14c0-4730-8bbd-43243818760d	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	C	1
89cef26a-8e8b-4bca-90af-f02e9adf4f84	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	C	2
4fb3f94b-c5c4-4d52-837e-07cda26ff38a	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	C	3
5f93840d-8d20-4d5d-80bf-fabc4c9ed2af	f017a484-72f4-4990-8df9-231026994b34	A	1
e988c2a5-2be8-41e0-a962-8396dd6a923d	f017a484-72f4-4990-8df9-231026994b34	A	2
587ae5c1-a3dc-4bf8-a315-1942c1bb429e	f017a484-72f4-4990-8df9-231026994b34	A	3
bd226bec-bd7d-46db-b9b7-efb499b7198f	f017a484-72f4-4990-8df9-231026994b34	A	4
99b67533-656b-4405-85bd-40a0945ea820	f017a484-72f4-4990-8df9-231026994b34	B	1
65363116-8bf0-40a0-952e-08250b79f924	f017a484-72f4-4990-8df9-231026994b34	B	2
77f69d40-8e8a-4059-a13b-131b10b35282	f017a484-72f4-4990-8df9-231026994b34	B	3
78404e04-87a4-4998-b71c-56f940a265a8	f017a484-72f4-4990-8df9-231026994b34	B	4
6c950659-82b4-443c-a548-ecc663be40dd	f017a484-72f4-4990-8df9-231026994b34	C	1
5e9ea0f6-8f04-4c72-9c4f-f9deaf2177ed	f017a484-72f4-4990-8df9-231026994b34	C	2
5db2c661-b42a-48f1-aa18-058c3c127323	f017a484-72f4-4990-8df9-231026994b34	C	3
6e4b3815-6da5-44ac-aa0c-06a1fbc0c9bd	f017a484-72f4-4990-8df9-231026994b34	C	4
34eb1079-1a2a-4fc7-b2bd-e8e76ed1f3b2	25335c69-fac4-478a-833f-96b7fcdfd277	A	1
7cf74048-875f-494c-8f40-be77d17e3d32	25335c69-fac4-478a-833f-96b7fcdfd277	A	2
9327b5af-8542-44a6-a80c-f4ab7e32b51e	25335c69-fac4-478a-833f-96b7fcdfd277	A	3
58ec3faa-8d8c-4477-83b7-8acdd3354e44	25335c69-fac4-478a-833f-96b7fcdfd277	A	4
f13e97cb-b26a-4b15-b71f-3b85c1f57112	25335c69-fac4-478a-833f-96b7fcdfd277	A	5
d56f18ff-056e-426c-8499-e4b89aa249f7	25335c69-fac4-478a-833f-96b7fcdfd277	B	1
5cdb7bdc-fcaa-4cc5-8e55-818802e9c535	25335c69-fac4-478a-833f-96b7fcdfd277	B	2
7156504a-231c-46c5-b2aa-d5d95cd95fe0	25335c69-fac4-478a-833f-96b7fcdfd277	B	3
630105a3-8a28-456e-a86a-6bcf9cf3282a	25335c69-fac4-478a-833f-96b7fcdfd277	B	4
b54789a7-581b-49cc-a1d8-588b445ee3f3	25335c69-fac4-478a-833f-96b7fcdfd277	B	5
be1c67b2-6724-46b4-8aed-4e44f1a8c837	25335c69-fac4-478a-833f-96b7fcdfd277	C	1
62a1ddde-99d7-4826-ac27-421e55de9657	25335c69-fac4-478a-833f-96b7fcdfd277	C	2
31e4ee87-f70c-4487-a4d1-8f5f4cfaa60b	25335c69-fac4-478a-833f-96b7fcdfd277	C	3
a0f1d5a0-4cef-4b72-bbd9-76dfe03cf7d7	25335c69-fac4-478a-833f-96b7fcdfd277	C	4
23029b5d-efa4-477b-81f8-d03c8b2ed6a0	25335c69-fac4-478a-833f-96b7fcdfd277	C	5
\.


--
-- Data for Name: assentos_sessao; Type: TABLE DATA; Schema: public; Owner: bilheteria
--

COPY public.assentos_sessao (id, sessao_id, assento_id, sala_id, reserva_atual_id) FROM stdin;
af8f3cb7-6b21-44a3-8e1d-3c457ea89c5f	cfac60dc-9cb8-424a-9619-2108f25603db	5be8b673-876c-4eb6-b2ae-1e1361438544	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
3f4f7ca7-fde5-4b6f-bd26-5a901c6bc373	cfac60dc-9cb8-424a-9619-2108f25603db	47efcee5-c6c2-4fae-a155-4cdd7fd0e4a1	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
d4897d80-d491-4f3f-a58a-267c6b8b34b5	cfac60dc-9cb8-424a-9619-2108f25603db	0d5d6f97-14c0-4730-8bbd-43243818760d	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
d6f7cd21-c255-408b-b52b-68db700fa16c	cfac60dc-9cb8-424a-9619-2108f25603db	4fb3f94b-c5c4-4d52-837e-07cda26ff38a	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
16826aa9-3b78-4199-aca7-1a13901b9879	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	9a63bf0e-babc-400d-9311-3f2fade7ab74	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
c8c60514-8077-4c8f-8c4a-8f29e5d01dd4	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	fe5a55f2-ec0a-4471-b331-c96becd85c88	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
4853b654-7194-4881-8a17-86db7e4fa4cd	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	47efcee5-c6c2-4fae-a155-4cdd7fd0e4a1	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
21086bc6-4641-4bf7-b105-5805b7d3ea55	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	0d5d6f97-14c0-4730-8bbd-43243818760d	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
21038ee6-2575-4db7-976c-43d85573a7ea	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	4fb3f94b-c5c4-4d52-837e-07cda26ff38a	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
5390fe75-35f3-420c-bcd4-0199e8a46f28	b1981341-fa39-4073-a0ce-2254ccc02cf9	4818d945-0b5d-4e5e-9d38-aa1083179558	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
f4a2d713-5a8b-46d8-a657-77b431dc9953	b1981341-fa39-4073-a0ce-2254ccc02cf9	5be8b673-876c-4eb6-b2ae-1e1361438544	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
98e05a70-5722-4249-a91b-bed943b15f44	b1981341-fa39-4073-a0ce-2254ccc02cf9	5636c129-c617-4f15-8cf1-2049e3860dcb	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
3e625aa9-021f-47cc-8953-95ef054fc2a3	b1981341-fa39-4073-a0ce-2254ccc02cf9	9a63bf0e-babc-400d-9311-3f2fade7ab74	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
2345b468-648e-4577-bf36-6e38330a0124	b1981341-fa39-4073-a0ce-2254ccc02cf9	fe5a55f2-ec0a-4471-b331-c96becd85c88	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
feb406a5-f973-4d2f-83bf-3431d89af569	b1981341-fa39-4073-a0ce-2254ccc02cf9	47efcee5-c6c2-4fae-a155-4cdd7fd0e4a1	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
42b5106a-959b-4069-98dc-780ddce28adc	b1981341-fa39-4073-a0ce-2254ccc02cf9	0d5d6f97-14c0-4730-8bbd-43243818760d	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
4d6a8dc8-4044-4f89-844d-2e115ec9cd34	b1981341-fa39-4073-a0ce-2254ccc02cf9	89cef26a-8e8b-4bca-90af-f02e9adf4f84	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
d92e5785-01ec-4440-b874-746b49f07666	b1981341-fa39-4073-a0ce-2254ccc02cf9	4fb3f94b-c5c4-4d52-837e-07cda26ff38a	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
4d2655a3-1913-4934-8399-34e6e921d9a9	cfac60dc-9cb8-424a-9619-2108f25603db	fe5a55f2-ec0a-4471-b331-c96becd85c88	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	4204a1fa-881e-44ac-9c28-7038165c02da
35f1fb59-d6ed-43ac-a4cf-634cfacd1fec	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	89cef26a-8e8b-4bca-90af-f02e9adf4f84	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	0b9cfc3e-14c5-4f74-b8b0-683d24752e77
153e3692-39fc-4f01-9c4f-19d970c0a3b1	cfac60dc-9cb8-424a-9619-2108f25603db	4818d945-0b5d-4e5e-9d38-aa1083179558	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	1dfde6d0-5a9b-4a81-bb60-1a3f4681e415
2e041369-060d-43d4-8218-4d42850833cf	e3181ca8-9aa1-4375-8982-b67d58caf9cb	5f93840d-8d20-4d5d-80bf-fabc4c9ed2af	f017a484-72f4-4990-8df9-231026994b34	\N
2f2e74a9-7374-405c-a13b-1b8ca018e572	e3181ca8-9aa1-4375-8982-b67d58caf9cb	e988c2a5-2be8-41e0-a962-8396dd6a923d	f017a484-72f4-4990-8df9-231026994b34	\N
f7be6372-babe-4f72-9178-2ddeae3b485f	e3181ca8-9aa1-4375-8982-b67d58caf9cb	587ae5c1-a3dc-4bf8-a315-1942c1bb429e	f017a484-72f4-4990-8df9-231026994b34	\N
c6114798-40b7-4e2b-9d03-ab08ba3baac8	e3181ca8-9aa1-4375-8982-b67d58caf9cb	99b67533-656b-4405-85bd-40a0945ea820	f017a484-72f4-4990-8df9-231026994b34	\N
c458c032-fea1-477f-98e5-dec91e85ec6e	e3181ca8-9aa1-4375-8982-b67d58caf9cb	77f69d40-8e8a-4059-a13b-131b10b35282	f017a484-72f4-4990-8df9-231026994b34	\N
a783dbc0-225c-4e35-89f1-b61d6689abed	e3181ca8-9aa1-4375-8982-b67d58caf9cb	78404e04-87a4-4998-b71c-56f940a265a8	f017a484-72f4-4990-8df9-231026994b34	\N
55cae591-0cda-4058-8c97-4a41ff17c362	e3181ca8-9aa1-4375-8982-b67d58caf9cb	6c950659-82b4-443c-a548-ecc663be40dd	f017a484-72f4-4990-8df9-231026994b34	\N
effc5d94-a9e9-4431-bdaa-2658180dc897	e3181ca8-9aa1-4375-8982-b67d58caf9cb	5db2c661-b42a-48f1-aa18-058c3c127323	f017a484-72f4-4990-8df9-231026994b34	\N
d1a30fd1-681c-46a6-bb4f-6d7659e50086	e3181ca8-9aa1-4375-8982-b67d58caf9cb	6e4b3815-6da5-44ac-aa0c-06a1fbc0c9bd	f017a484-72f4-4990-8df9-231026994b34	\N
28634d6a-a641-4bee-9cc3-e1b5a60defe6	e3181ca8-9aa1-4375-8982-b67d58caf9cb	bd226bec-bd7d-46db-b9b7-efb499b7198f	f017a484-72f4-4990-8df9-231026994b34	492e3c51-3f3f-483f-88c4-650c02a1742c
9761203d-dc9e-44ce-a64a-5e8a7de74cf2	e3181ca8-9aa1-4375-8982-b67d58caf9cb	5e9ea0f6-8f04-4c72-9c4f-f9deaf2177ed	f017a484-72f4-4990-8df9-231026994b34	\N
f803ca62-4525-4ccd-bbe8-8daf5f20be89	e3181ca8-9aa1-4375-8982-b67d58caf9cb	65363116-8bf0-40a0-952e-08250b79f924	f017a484-72f4-4990-8df9-231026994b34	\N
dae7b9f2-3115-4cf3-a18b-4345dcd0cc22	cfac60dc-9cb8-424a-9619-2108f25603db	5636c129-c617-4f15-8cf1-2049e3860dcb	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
a31a22a7-c88b-409f-a217-f6179953c132	cfac60dc-9cb8-424a-9619-2108f25603db	9a63bf0e-babc-400d-9311-3f2fade7ab74	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
70408a1b-d75b-469e-beb7-1a37e156fb78	cfac60dc-9cb8-424a-9619-2108f25603db	89cef26a-8e8b-4bca-90af-f02e9adf4f84	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
c344c5d9-06d9-4a32-a191-29a9f025d114	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	5be8b673-876c-4eb6-b2ae-1e1361438544	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
eaa91ef6-90e0-494b-9e3c-86926724d530	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	5636c129-c617-4f15-8cf1-2049e3860dcb	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
ed039b05-1b6f-4265-a2f1-60f19f21ce49	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	4818d945-0b5d-4e5e-9d38-aa1083179558	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	\N
85368730-1810-46f9-b80b-7541ef88aa35	1cc613d2-8d9d-46f9-8f28-086ae35673fc	7cf74048-875f-494c-8f40-be77d17e3d32	25335c69-fac4-478a-833f-96b7fcdfd277	\N
bf44bf98-7b05-4dd5-a48b-84836dd9eda4	1cc613d2-8d9d-46f9-8f28-086ae35673fc	58ec3faa-8d8c-4477-83b7-8acdd3354e44	25335c69-fac4-478a-833f-96b7fcdfd277	\N
43208925-699d-466a-9cf2-a83c215b7f7c	1cc613d2-8d9d-46f9-8f28-086ae35673fc	f13e97cb-b26a-4b15-b71f-3b85c1f57112	25335c69-fac4-478a-833f-96b7fcdfd277	\N
25c98931-92d3-4d0b-bd8c-f6ca7068cba5	1cc613d2-8d9d-46f9-8f28-086ae35673fc	d56f18ff-056e-426c-8499-e4b89aa249f7	25335c69-fac4-478a-833f-96b7fcdfd277	\N
fc56f4fe-5252-43fa-aaa4-b9fd28462744	1cc613d2-8d9d-46f9-8f28-086ae35673fc	5cdb7bdc-fcaa-4cc5-8e55-818802e9c535	25335c69-fac4-478a-833f-96b7fcdfd277	\N
b9c3a54b-55c8-4e4a-909f-9232f8b000a7	1cc613d2-8d9d-46f9-8f28-086ae35673fc	7156504a-231c-46c5-b2aa-d5d95cd95fe0	25335c69-fac4-478a-833f-96b7fcdfd277	\N
dad9c774-f48a-4f48-afd8-6f938b55477d	1cc613d2-8d9d-46f9-8f28-086ae35673fc	630105a3-8a28-456e-a86a-6bcf9cf3282a	25335c69-fac4-478a-833f-96b7fcdfd277	\N
bbadf59b-6e35-4f5f-a847-017f07d19b15	1cc613d2-8d9d-46f9-8f28-086ae35673fc	b54789a7-581b-49cc-a1d8-588b445ee3f3	25335c69-fac4-478a-833f-96b7fcdfd277	\N
078a9fb9-29fe-4543-ac9b-2e8d4954790f	1cc613d2-8d9d-46f9-8f28-086ae35673fc	be1c67b2-6724-46b4-8aed-4e44f1a8c837	25335c69-fac4-478a-833f-96b7fcdfd277	\N
1ef8507f-7231-47bc-9327-8b8e35ae52a8	1cc613d2-8d9d-46f9-8f28-086ae35673fc	62a1ddde-99d7-4826-ac27-421e55de9657	25335c69-fac4-478a-833f-96b7fcdfd277	\N
5726eb6f-f895-44df-9e4e-680da06454f4	1cc613d2-8d9d-46f9-8f28-086ae35673fc	31e4ee87-f70c-4487-a4d1-8f5f4cfaa60b	25335c69-fac4-478a-833f-96b7fcdfd277	\N
0de1a8bb-700f-4ae0-b282-1dfe6c035f0a	1cc613d2-8d9d-46f9-8f28-086ae35673fc	a0f1d5a0-4cef-4b72-bbd9-76dfe03cf7d7	25335c69-fac4-478a-833f-96b7fcdfd277	\N
8be2dc7d-0f48-41aa-8ffa-abf7786d2874	1cc613d2-8d9d-46f9-8f28-086ae35673fc	23029b5d-efa4-477b-81f8-d03c8b2ed6a0	25335c69-fac4-478a-833f-96b7fcdfd277	\N
0a2006e0-288c-48d1-a861-781d25356862	1cc613d2-8d9d-46f9-8f28-086ae35673fc	34eb1079-1a2a-4fc7-b2bd-e8e76ed1f3b2	25335c69-fac4-478a-833f-96b7fcdfd277	bc077336-7654-4df0-8347-c9623fc57e43
10d024d6-58f5-4ed7-bc54-dccc5f1c50d8	1cc613d2-8d9d-46f9-8f28-086ae35673fc	9327b5af-8542-44a6-a80c-f4ab7e32b51e	25335c69-fac4-478a-833f-96b7fcdfd277	bc077336-7654-4df0-8347-c9623fc57e43
\.


--
-- Data for Name: auditorias_ingressos; Type: TABLE DATA; Schema: public; Owner: bilheteria
--

COPY public.auditorias_ingressos (id, ingresso_id, acao, registrado_em, uso_anterior_em, uso_atual_em, responsavel_id) FROM stdin;
1	2197fc2b-971a-490c-bd1a-6e005309abf9	INSERCAO	2026-11-22 19:26:22.165+00	\N	\N	\N
2	f459ab80-eddd-40b4-ab6c-7ef8543963a3	INSERCAO	2026-11-23 15:44:41.721+00	\N	\N	\N
3	28fdc6e5-5e48-4cc8-8392-557e7b44aadb	INSERCAO	2026-11-24 00:14:56.851+00	\N	\N	\N
4	f2dbce91-5e7f-4ef7-a894-fd5f555dc70d	INSERCAO	2026-11-24 00:24:06.954+00	\N	\N	\N
5	f2dbce91-5e7f-4ef7-a894-fd5f555dc70d	ATUALIZACAO	2026-11-24 23:16:09.68+00	\N	2026-11-24 23:16:09.686+00	e7613112-b95c-45bf-a850-da55b30403d0
6	c5cb8908-1323-40f4-ace1-d0e795486b03	INSERCAO	2026-11-24 23:55:26.251+00	\N	\N	\N
7	757a1f24-ccca-4319-8b98-63906506b2c3	INSERCAO	2026-11-24 23:55:26.251+00	\N	\N	\N
8	757a1f24-ccca-4319-8b98-63906506b2c3	ATUALIZACAO	2026-11-24 23:55:42.504+00	\N	2026-11-24 23:55:42.508+00	e7613112-b95c-45bf-a850-da55b30403d0
\.


--
-- Data for Name: eventos; Type: TABLE DATA; Schema: public; Owner: bilheteria
--

COPY public.eventos (id, titulo, descricao, tipo) FROM stdin;
92b3d091-498a-4fe3-89b6-c69c711d5e8f	O Jogo da Imitação	Filme bom	FILME
d8ebe38d-fa3f-44b3-a763-f8ed8a15c4b4	Velozes & Furiosos	Filme bom	FILME
33d27b20-7bb7-4d0d-b87b-ac6c103b8bbe	Test1	ok	FILME
2b9b1fdb-4d86-4f53-bff7-9a4365c7047d	SalaTeste2	SalaTeste2	FILME
5ebd0df9-0370-4e04-b04b-f9c793dfcd88	Vingadores	teste	FILME
\.


--
-- Data for Name: ingressos; Type: TABLE DATA; Schema: public; Owner: bilheteria
--

COPY public.ingressos (id, item_reserva_id, assento_sessao_id, codigo, emitido_em, utilizado_em, validado_por_id) FROM stdin;
2197fc2b-971a-490c-bd1a-6e005309abf9	0c9bda90-89f9-4b2f-a62d-b2977d29452f	4d2655a3-1913-4934-8399-34e6e921d9a9	5211113CB9D03F46FAB1903D	2026-11-22 19:26:22.181+00	\N	\N
f459ab80-eddd-40b4-ab6c-7ef8543963a3	3bae5145-bf5c-4b92-92e6-d1c1f9c308fe	35f1fb59-d6ed-43ac-a4cf-634cfacd1fec	5C2352A5862DFF3443EFEC29	2026-11-23 15:44:41.733+00	\N	\N
28fdc6e5-5e48-4cc8-8392-557e7b44aadb	2484e4b1-d505-4b0d-871a-1b934c1a81e2	153e3692-39fc-4f01-9c4f-19d970c0a3b1	B05D7FBE7B4705B314BB348E	2026-11-24 00:14:56.86+00	\N	\N
f2dbce91-5e7f-4ef7-a894-fd5f555dc70d	57f815bf-99fa-474b-8c78-b66a97c01748	28634d6a-a641-4bee-9cc3-e1b5a60defe6	4727AE1A387CF766CA558AD6	2026-11-24 00:24:06.962+00	2026-11-24 23:16:09.686+00	e7613112-b95c-45bf-a850-da55b30403d0
c5cb8908-1323-40f4-ace1-d0e795486b03	7834416f-150f-49a4-b22f-f5c48d1d259d	0a2006e0-288c-48d1-a861-781d25356862	9204FDA35E6130793FD48C18	2026-11-24 23:55:26.264+00	\N	\N
757a1f24-ccca-4319-8b98-63906506b2c3	44cca568-223b-4ccf-93fb-f529e5c12a16	10d024d6-58f5-4ed7-bc54-dccc5f1c50d8	18AC0492F3A7EE34EDAB23EB	2026-11-24 23:55:26.267+00	2026-11-24 23:55:42.508+00	e7613112-b95c-45bf-a850-da55b30403d0
\.


--
-- Data for Name: itens_reserva; Type: TABLE DATA; Schema: public; Owner: bilheteria
--

COPY public.itens_reserva (id, reserva_id, assento_sessao_id, sessao_id, preco_unitario) FROM stdin;
0c9bda90-89f9-4b2f-a62d-b2977d29452f	4204a1fa-881e-44ac-9c28-7038165c02da	4d2655a3-1913-4934-8399-34e6e921d9a9	cfac60dc-9cb8-424a-9619-2108f25603db	10.00
3bae5145-bf5c-4b92-92e6-d1c1f9c308fe	0b9cfc3e-14c5-4f74-b8b0-683d24752e77	35f1fb59-d6ed-43ac-a4cf-634cfacd1fec	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	15.00
2484e4b1-d505-4b0d-871a-1b934c1a81e2	1dfde6d0-5a9b-4a81-bb60-1a3f4681e415	153e3692-39fc-4f01-9c4f-19d970c0a3b1	cfac60dc-9cb8-424a-9619-2108f25603db	10.00
57f815bf-99fa-474b-8c78-b66a97c01748	492e3c51-3f3f-483f-88c4-650c02a1742c	28634d6a-a641-4bee-9cc3-e1b5a60defe6	e3181ca8-9aa1-4375-8982-b67d58caf9cb	20.00
c5ae52bc-41a7-4058-9b7e-9206276bcd34	cf1873fe-2836-428b-8b94-218e3eefb9d2	f803ca62-4525-4ccd-bbe8-8daf5f20be89	e3181ca8-9aa1-4375-8982-b67d58caf9cb	20.00
e4ae91ea-93d8-4218-9d5a-4832730e535c	55530ba5-4d93-4085-9463-fc67bc16ac14	9761203d-dc9e-44ce-a64a-5e8a7de74cf2	e3181ca8-9aa1-4375-8982-b67d58caf9cb	20.00
288b4664-9a9f-4af0-93dd-5af461b051f9	ff788700-5d37-4406-b71c-6fec76c89164	f803ca62-4525-4ccd-bbe8-8daf5f20be89	e3181ca8-9aa1-4375-8982-b67d58caf9cb	20.00
fdbdbbde-af0f-40c7-b6f3-a163a30eec4d	aa3b5096-edee-47e6-a467-600b5f02baad	ed039b05-1b6f-4265-a2f1-60f19f21ce49	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	15.00
b5792d22-d73c-4610-96e4-783bfe115e62	fafd39ca-6518-45f0-8165-edb472a4ce44	dae7b9f2-3115-4cf3-a18b-4345dcd0cc22	cfac60dc-9cb8-424a-9619-2108f25603db	10.00
7b70a53b-8810-4ed5-854e-0ff857a2870e	fafd39ca-6518-45f0-8165-edb472a4ce44	a31a22a7-c88b-409f-a217-f6179953c132	cfac60dc-9cb8-424a-9619-2108f25603db	10.00
ae93e1c5-9f3f-4793-b159-e79d5bfe7496	fafd39ca-6518-45f0-8165-edb472a4ce44	70408a1b-d75b-469e-beb7-1a37e156fb78	cfac60dc-9cb8-424a-9619-2108f25603db	10.00
028ab39d-0079-4621-88cd-6a2bb3fca3bb	2a737678-d78e-43be-9a52-f59901c6e1dd	ed039b05-1b6f-4265-a2f1-60f19f21ce49	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	15.00
3b685e69-040d-4706-aafc-c3204b4a9600	2a737678-d78e-43be-9a52-f59901c6e1dd	eaa91ef6-90e0-494b-9e3c-86926724d530	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	15.00
ef5690a5-2fe5-436f-8d89-6b8852d7795d	2a737678-d78e-43be-9a52-f59901c6e1dd	c344c5d9-06d9-4a32-a191-29a9f025d114	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	15.00
7834416f-150f-49a4-b22f-f5c48d1d259d	bc077336-7654-4df0-8347-c9623fc57e43	0a2006e0-288c-48d1-a861-781d25356862	1cc613d2-8d9d-46f9-8f28-086ae35673fc	20.00
44cca568-223b-4ccf-93fb-f529e5c12a16	bc077336-7654-4df0-8347-c9623fc57e43	10d024d6-58f5-4ed7-bc54-dccc5f1c50d8	1cc613d2-8d9d-46f9-8f28-086ae35673fc	20.00
\.


--
-- Data for Name: pagamentos; Type: TABLE DATA; Schema: public; Owner: bilheteria
--

COPY public.pagamentos (id, reserva_id, valor, pago_em, simulado) FROM stdin;
00532a64-28a4-43fa-8f0d-2f20d76883ca	4204a1fa-881e-44ac-9c28-7038165c02da	10.00	2026-11-22 19:26:22.179+00	t
308b34a1-9225-471e-ba92-b8604267b0d0	0b9cfc3e-14c5-4f74-b8b0-683d24752e77	15.00	2026-11-23 15:44:41.727+00	t
4ccbbcf8-0b5c-4acf-9c1c-f5b0f6baec4a	1dfde6d0-5a9b-4a81-bb60-1a3f4681e415	10.00	2026-11-24 00:14:56.858+00	t
643b5601-2862-4756-9e62-38cb3e15c440	492e3c51-3f3f-483f-88c4-650c02a1742c	20.00	2026-11-24 00:24:06.961+00	t
7ba2a541-6dfd-4178-96b0-a948aaa81949	bc077336-7654-4df0-8347-c9623fc57e43	40.00	2026-11-24 23:55:26.257+00	t
\.


--
-- Data for Name: reservas; Type: TABLE DATA; Schema: public; Owner: bilheteria
--

COPY public.reservas (id, sessao_id, usuario_id, situacao, canal_venda, expira_em, valor_total, criado_em) FROM stdin;
4204a1fa-881e-44ac-9c28-7038165c02da	cfac60dc-9cb8-424a-9619-2108f25603db	4520e979-38b9-445f-a8dd-61f377dcad31	PAGA	INTERNET	2026-11-22 19:36:18.619+00	10.00	2026-11-22 19:26:18.624+00
0b9cfc3e-14c5-4f74-b8b0-683d24752e77	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	4520e979-38b9-445f-a8dd-61f377dcad31	PAGA	INTERNET	2026-11-23 15:54:39.513+00	15.00	2026-11-23 15:44:39.519+00
1dfde6d0-5a9b-4a81-bb60-1a3f4681e415	cfac60dc-9cb8-424a-9619-2108f25603db	b9d534fc-e5a7-47db-bf7c-2345cd5bdfb6	PAGA	INTERNET	2026-11-24 00:24:53.986+00	10.00	2026-11-24 00:14:53.99+00
492e3c51-3f3f-483f-88c4-650c02a1742c	e3181ca8-9aa1-4375-8982-b67d58caf9cb	b9d534fc-e5a7-47db-bf7c-2345cd5bdfb6	PAGA	INTERNET	2026-11-24 00:34:06.074+00	20.00	2026-11-24 00:24:06.078+00
cf1873fe-2836-428b-8b94-218e3eefb9d2	e3181ca8-9aa1-4375-8982-b67d58caf9cb	b9d534fc-e5a7-47db-bf7c-2345cd5bdfb6	EXPIRADA	INTERNET	2026-11-24 00:34:20.821+00	20.00	2026-11-24 00:24:20.825+00
55530ba5-4d93-4085-9463-fc67bc16ac14	e3181ca8-9aa1-4375-8982-b67d58caf9cb	b9d534fc-e5a7-47db-bf7c-2345cd5bdfb6	EXPIRADA	INTERNET	2026-11-24 00:35:01.359+00	20.00	2026-11-24 00:25:01.368+00
ff788700-5d37-4406-b71c-6fec76c89164	e3181ca8-9aa1-4375-8982-b67d58caf9cb	b9d534fc-e5a7-47db-bf7c-2345cd5bdfb6	EXPIRADA	INTERNET	2026-11-24 10:01:16.153+00	20.00	2026-11-24 09:51:16.159+00
aa3b5096-edee-47e6-a467-600b5f02baad	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	b9d534fc-e5a7-47db-bf7c-2345cd5bdfb6	EXPIRADA	INTERNET	2026-11-24 22:38:14.35+00	15.00	2026-11-24 22:28:14.356+00
fafd39ca-6518-45f0-8165-edb472a4ce44	cfac60dc-9cb8-424a-9619-2108f25603db	b9d534fc-e5a7-47db-bf7c-2345cd5bdfb6	EXPIRADA	INTERNET	2026-11-24 22:43:01.858+00	30.00	2026-11-24 22:33:01.901+00
2a737678-d78e-43be-9a52-f59901c6e1dd	e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	b9d534fc-e5a7-47db-bf7c-2345cd5bdfb6	EXPIRADA	INTERNET	2026-11-24 22:52:02.149+00	45.00	2026-11-24 22:42:02.23+00
bc077336-7654-4df0-8347-c9623fc57e43	1cc613d2-8d9d-46f9-8f28-086ae35673fc	b9d534fc-e5a7-47db-bf7c-2345cd5bdfb6	PAGA	INTERNET	2026-11-25 00:05:00.201+00	40.00	2026-11-24 23:55:00.206+00
\.


--
-- Data for Name: salas; Type: TABLE DATA; Schema: public; Owner: bilheteria
--

COPY public.salas (id, nome) FROM stdin;
ef33e8b6-5040-41a8-8a00-35fe72e4ccef	Sala 01
f017a484-72f4-4990-8df9-231026994b34	Sala2
25335c69-fac4-478a-833f-96b7fcdfd277	Sala 3
\.


--
-- Data for Name: sessoes; Type: TABLE DATA; Schema: public; Owner: bilheteria
--

COPY public.sessoes (id, evento_id, sala_id, inicio_em, preco) FROM stdin;
cfac60dc-9cb8-424a-9619-2108f25603db	33d27b20-7bb7-4d0d-b87b-ac6c103b8bbe	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	2026-11-23 01:00:00+00	10.00
e3a03e7a-bd9c-4ad8-b2b2-5ef3bda5ee32	92b3d091-498a-4fe3-89b6-c69c711d5e8f	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	2026-11-24 02:00:00+00	15.00
b1981341-fa39-4073-a0ce-2254ccc02cf9	d8ebe38d-fa3f-44b3-a763-f8ed8a15c4b4	ef33e8b6-5040-41a8-8a00-35fe72e4ccef	2026-11-24 22:00:00+00	20.00
e3181ca8-9aa1-4375-8982-b67d58caf9cb	2b9b1fdb-4d86-4f53-bff7-9a4365c7047d	f017a484-72f4-4990-8df9-231026994b34	2026-11-26 02:00:00+00	20.00
1cc613d2-8d9d-46f9-8f28-086ae35673fc	5ebd0df9-0370-4e04-b04b-f9c793dfcd88	25335c69-fac4-478a-833f-96b7fcdfd277	2026-11-25 16:00:00+00	20.00
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: bilheteria
--

COPY public.usuarios (id, nome, email, hash_senha, perfil, criado_em) FROM stdin;
602e6923-641d-4f3a-b66d-6d3fbadaff29	gustavo1	gustavo@gmail.com	8fb46ad759ade2cf28b7bd2f689b5642:29338b8f50954a0dd354875dcf9c64f6e11ef68b3f00794bcfe00df97e03cfa518da434481191e41cc479d130bd6b015e6e0a967a892f0d09749cc7ae0baf690	CLIENTE	2026-11-20 16:02:15.374+00
4520e979-38b9-445f-a8dd-61f377dcad31	gustavoh	gustavoh@gmail.com	afcedc58cc509ba5939b7c2e43407ee4:2834ed92d0c6bc3f9100f099883109a8c54b005a1e293e001cb8b36e29cdc7f76ef18e9bb62b9e61d7ef453fcf583a12150b72598595fbd739e01e7a0a063508	CLIENTE	2026-11-22 15:20:01.086+00
e7613112-b95c-45bf-a850-da55b30403d0	adm	adm@adm.com	1476d71e414559319b036135333d1ed1:2e98b96f63a896c3d8c9ba67ed6cc59887078989c975c765b419c75489147a85f5f8cf02b143158338cf8fa7428c095d5a80b9acc8eb10f5509b7ba8d6c8c90a	OPERADOR	2026-11-22 15:29:34.247+00
b9d534fc-e5a7-47db-bf7c-2345cd5bdfb6	teste	teste@gmail.com	ae129e19546da2988d44453b291b8139:55f21ea3e50f5a257d5c30af5996470a9a5b783050e7acd881069760a0b0859480747570e3f7107257461110c66109821da1416c202a8ce0b7e7ab3a62349a96	CLIENTE	2026-11-24 00:14:31.221+00
3a17f2d7-9166-44da-84c0-cdb985938179	angelo	avp.antonini@gmail.com	9e6dd66241550f97cbb957c85090f372:ac6caef0396975cf6d7720a93f219210a56c1a417d90af77728ea7150508ed727ea1ce87fd20e82fe83c9204f76820e71408daa23d17376e395b064ad2d301f7	CLIENTE	2026-11-24 01:00:23.832+00
\.


--
-- Name: auditorias_ingressos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bilheteria
--

SELECT pg_catalog.setval('public.auditorias_ingressos_id_seq', 8, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: assentos pk_assentos; Type: CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.assentos
    ADD CONSTRAINT pk_assentos PRIMARY KEY (id);


--
-- Name: assentos_sessao pk_assentos_sessao; Type: CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.assentos_sessao
    ADD CONSTRAINT pk_assentos_sessao PRIMARY KEY (id);


--
-- Name: auditorias_ingressos pk_auditorias_ingressos; Type: CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.auditorias_ingressos
    ADD CONSTRAINT pk_auditorias_ingressos PRIMARY KEY (id);


--
-- Name: eventos pk_eventos; Type: CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT pk_eventos PRIMARY KEY (id);


--
-- Name: ingressos pk_ingressos; Type: CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.ingressos
    ADD CONSTRAINT pk_ingressos PRIMARY KEY (id);


--
-- Name: itens_reserva pk_itens_reserva; Type: CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.itens_reserva
    ADD CONSTRAINT pk_itens_reserva PRIMARY KEY (id);


--
-- Name: pagamentos pk_pagamentos; Type: CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pk_pagamentos PRIMARY KEY (id);


--
-- Name: reservas pk_reservas; Type: CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.reservas
    ADD CONSTRAINT pk_reservas PRIMARY KEY (id);


--
-- Name: salas pk_salas; Type: CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.salas
    ADD CONSTRAINT pk_salas PRIMARY KEY (id);


--
-- Name: sessoes pk_sessoes; Type: CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.sessoes
    ADD CONSTRAINT pk_sessoes PRIMARY KEY (id);


--
-- Name: usuarios pk_usuarios; Type: CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT pk_usuarios PRIMARY KEY (id);


--
-- Name: idx_assentos_sessao_assento_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE INDEX idx_assentos_sessao_assento_id ON public.assentos_sessao USING btree (assento_id);


--
-- Name: idx_assentos_sessao_reserva_atual_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE INDEX idx_assentos_sessao_reserva_atual_id ON public.assentos_sessao USING btree (reserva_atual_id);


--
-- Name: idx_auditorias_ingressos_ingresso_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE INDEX idx_auditorias_ingressos_ingresso_id ON public.auditorias_ingressos USING btree (ingresso_id);


--
-- Name: idx_ingressos_validado_por_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE INDEX idx_ingressos_validado_por_id ON public.ingressos USING btree (validado_por_id);


--
-- Name: idx_itens_reserva_assento_sessao_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE INDEX idx_itens_reserva_assento_sessao_id ON public.itens_reserva USING btree (assento_sessao_id);


--
-- Name: idx_reservas_sessao_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE INDEX idx_reservas_sessao_id ON public.reservas USING btree (sessao_id);


--
-- Name: idx_reservas_situacao_expira_em; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE INDEX idx_reservas_situacao_expira_em ON public.reservas USING btree (situacao, expira_em);


--
-- Name: idx_reservas_usuario_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE INDEX idx_reservas_usuario_id ON public.reservas USING btree (usuario_id);


--
-- Name: idx_sessoes_evento_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE INDEX idx_sessoes_evento_id ON public.sessoes USING btree (evento_id);


--
-- Name: idx_sessoes_inicio_em; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE INDEX idx_sessoes_inicio_em ON public.sessoes USING btree (inicio_em);


--
-- Name: idx_sessoes_sala_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE INDEX idx_sessoes_sala_id ON public.sessoes USING btree (sala_id);


--
-- Name: uq_assentos_id_sala_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_assentos_id_sala_id ON public.assentos USING btree (id, sala_id);


--
-- Name: uq_assentos_sala_id_fila_numero; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_assentos_sala_id_fila_numero ON public.assentos USING btree (sala_id, fila, numero);


--
-- Name: uq_assentos_sessao_id_sessao_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_assentos_sessao_id_sessao_id ON public.assentos_sessao USING btree (id, sessao_id);


--
-- Name: uq_assentos_sessao_sessao_id_assento_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_assentos_sessao_sessao_id_assento_id ON public.assentos_sessao USING btree (sessao_id, assento_id);


--
-- Name: uq_ingressos_assento_sessao_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_ingressos_assento_sessao_id ON public.ingressos USING btree (assento_sessao_id);


--
-- Name: uq_ingressos_codigo; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_ingressos_codigo ON public.ingressos USING btree (codigo);


--
-- Name: uq_ingressos_item_reserva_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_ingressos_item_reserva_id ON public.ingressos USING btree (item_reserva_id);


--
-- Name: uq_ingressos_item_reserva_id_assento_sessao_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_ingressos_item_reserva_id_assento_sessao_id ON public.ingressos USING btree (item_reserva_id, assento_sessao_id);


--
-- Name: uq_itens_reserva_id_assento_sessao_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_itens_reserva_id_assento_sessao_id ON public.itens_reserva USING btree (id, assento_sessao_id);


--
-- Name: uq_itens_reserva_reserva_id_assento_sessao_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_itens_reserva_reserva_id_assento_sessao_id ON public.itens_reserva USING btree (reserva_id, assento_sessao_id);


--
-- Name: uq_pagamentos_reserva_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_pagamentos_reserva_id ON public.pagamentos USING btree (reserva_id);


--
-- Name: uq_reservas_id_sessao_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_reservas_id_sessao_id ON public.reservas USING btree (id, sessao_id);


--
-- Name: uq_sessoes_id_sala_id; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_sessoes_id_sala_id ON public.sessoes USING btree (id, sala_id);


--
-- Name: uq_usuarios_email; Type: INDEX; Schema: public; Owner: bilheteria
--

CREATE UNIQUE INDEX uq_usuarios_email ON public.usuarios USING btree (email);


--
-- Name: ingressos trg_auditar_ingresso; Type: TRIGGER; Schema: public; Owner: bilheteria
--

CREATE TRIGGER trg_auditar_ingresso AFTER INSERT OR UPDATE ON public.ingressos FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_ingresso();


--
-- Name: assentos fk_assentos_sala_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.assentos
    ADD CONSTRAINT fk_assentos_sala_id FOREIGN KEY (sala_id) REFERENCES public.salas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assentos_sessao fk_assentos_sessao_assento_id_sala_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.assentos_sessao
    ADD CONSTRAINT fk_assentos_sessao_assento_id_sala_id FOREIGN KEY (assento_id, sala_id) REFERENCES public.assentos(id, sala_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assentos_sessao fk_assentos_sessao_reserva_atual_id_sessao_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.assentos_sessao
    ADD CONSTRAINT fk_assentos_sessao_reserva_atual_id_sessao_id FOREIGN KEY (reserva_atual_id, sessao_id) REFERENCES public.reservas(id, sessao_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assentos_sessao fk_assentos_sessao_sessao_id_sala_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.assentos_sessao
    ADD CONSTRAINT fk_assentos_sessao_sessao_id_sala_id FOREIGN KEY (sessao_id, sala_id) REFERENCES public.sessoes(id, sala_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: auditorias_ingressos fk_auditorias_ingressos_ingresso_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.auditorias_ingressos
    ADD CONSTRAINT fk_auditorias_ingressos_ingresso_id FOREIGN KEY (ingresso_id) REFERENCES public.ingressos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ingressos fk_ingressos_assento_sessao_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.ingressos
    ADD CONSTRAINT fk_ingressos_assento_sessao_id FOREIGN KEY (assento_sessao_id) REFERENCES public.assentos_sessao(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ingressos fk_ingressos_item_reserva_id_assento_sessao_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.ingressos
    ADD CONSTRAINT fk_ingressos_item_reserva_id_assento_sessao_id FOREIGN KEY (item_reserva_id, assento_sessao_id) REFERENCES public.itens_reserva(id, assento_sessao_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ingressos fk_ingressos_validado_por_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.ingressos
    ADD CONSTRAINT fk_ingressos_validado_por_id FOREIGN KEY (validado_por_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: itens_reserva fk_itens_reserva_assento_sessao_id_sessao_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.itens_reserva
    ADD CONSTRAINT fk_itens_reserva_assento_sessao_id_sessao_id FOREIGN KEY (assento_sessao_id, sessao_id) REFERENCES public.assentos_sessao(id, sessao_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: itens_reserva fk_itens_reserva_reserva_id_sessao_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.itens_reserva
    ADD CONSTRAINT fk_itens_reserva_reserva_id_sessao_id FOREIGN KEY (reserva_id, sessao_id) REFERENCES public.reservas(id, sessao_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pagamentos fk_pagamentos_reserva_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT fk_pagamentos_reserva_id FOREIGN KEY (reserva_id) REFERENCES public.reservas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reservas fk_reservas_sessao_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.reservas
    ADD CONSTRAINT fk_reservas_sessao_id FOREIGN KEY (sessao_id) REFERENCES public.sessoes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reservas fk_reservas_usuario_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.reservas
    ADD CONSTRAINT fk_reservas_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sessoes fk_sessoes_evento_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.sessoes
    ADD CONSTRAINT fk_sessoes_evento_id FOREIGN KEY (evento_id) REFERENCES public.eventos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sessoes fk_sessoes_sala_id; Type: FK CONSTRAINT; Schema: public; Owner: bilheteria
--

ALTER TABLE ONLY public.sessoes
    ADD CONSTRAINT fk_sessoes_sala_id FOREIGN KEY (sala_id) REFERENCES public.salas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict RakKkfx9ces7UqMqG7EAdf6qB8jJqeje9BSMdd02i9OU4BsnXd9a9b19nj8nF3L


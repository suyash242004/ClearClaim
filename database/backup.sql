--
-- PostgreSQL database dump
--

\restrict 44mZHFhac6o8FHe4FXXCVCBgrXVu7lyXAzoQ1BimTRr4BWJweVagBo7VegZtG3u

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Name: claim_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.claim_status AS ENUM (
    'Pending',
    'Approved',
    'Rejected'
);


ALTER TYPE public.claim_status OWNER TO postgres;

--
-- Name: prevent_duplicate_relation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_duplicate_relation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM familymember
        WHERE policy_id = NEW.policy_id
        AND relation = NEW.relation
    ) THEN
        RAISE EXCEPTION 'Duplicate relation not allowed: %', NEW.relation;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.prevent_duplicate_relation() OWNER TO postgres;

--
-- Name: validate_claim_amount(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_claim_amount() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    total_claimed NUMERIC;
    coverage NUMERIC;
BEGIN
    -- Get plan coverage
    SELECT ip.coverage_amount
    INTO coverage
    FROM Policys p
    JOIN InsurancePlan ip ON p.plan_id = ip.plan_id
    WHERE p.policy_id = NEW.policy_id;

    -- Total approved claims so far
    SELECT COALESCE(SUM(claim_amount), 0)
    INTO total_claimed
    FROM Claims
    WHERE policy_id = NEW.policy_id
      AND status = 'Approved';

    -- Check if new claim exceeds coverage
    IF (total_claimed + NEW.claim_amount) > coverage THEN
        RAISE EXCEPTION 'Claim exceeds policy coverage limit';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_claim_amount() OWNER TO postgres;

--
-- Name: validate_claim_hospital(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_claim_hospital() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if hospital is mapped to the plan of this policy
    IF NOT EXISTS (
        SELECT 1
        FROM Policys p
        JOIN PlanHospital ph ON p.plan_id = ph.plan_id
        WHERE p.policy_id = NEW.policy_id
          AND ph.hospital_id = NEW.hospital_id
    ) THEN
        RAISE EXCEPTION 'Hospital is not covered under this insurance plan';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_claim_hospital() OWNER TO postgres;

--
-- Name: validate_family_age(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_family_age() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    cust_age INT;
BEGIN
    -- Get customer age
    SELECT c.age INTO cust_age
    FROM customer c
    JOIN policys p ON c.customer_id = p.customer_id
    WHERE p.policy_id = NEW.policy_id;

    -- Parent validation
    IF NEW.relation IN ('Father', 'Mother') THEN
        IF NEW.age <= cust_age THEN
            RAISE EXCEPTION 'Parent must be older than customer';
        END IF;
    END IF;

    -- Child validation
    IF NEW.relation IN ('Son', 'Daughter') THEN
        IF NEW.age >= cust_age THEN
            RAISE EXCEPTION 'Child must be younger than customer';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_family_age() OWNER TO postgres;

--
-- Name: validate_family_relation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_family_relation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    plan INT;
BEGIN
    -- Get plan of the policy
    SELECT plan_id INTO plan
    FROM policys
    WHERE policy_id = NEW.policy_id;

    -- Personal plan → no family allowed
    IF plan = 1 THEN
        RAISE EXCEPTION 'Personal plan does not allow family members';
    END IF;

    -- Parent plan → allow only parents
    IF plan = 3 AND NEW.relation NOT IN ('Father', 'Mother') THEN
        RAISE EXCEPTION 'Parent plan allows only Father or Mother';
    END IF;

    -- Family plan → no parents allowed
    IF plan = 2 AND NEW.relation IN ('Father', 'Mother') THEN
        RAISE EXCEPTION 'Family plan does not cover parents';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_family_relation() OWNER TO postgres;

--
-- Name: validate_max_family_members(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_max_family_members() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    member_count INT;
    allowed_members INT;
BEGIN
    -- Count current members
    SELECT COUNT(*) INTO member_count
    FROM FamilyMember
    WHERE policy_id = NEW.policy_id;

    -- Get allowed members from plan
    SELECT ip.max_members INTO allowed_members
    FROM Policys p
    JOIN InsurancePlan ip ON p.plan_id = ip.plan_id
    WHERE p.policy_id = NEW.policy_id;

    -- Validate
    IF member_count >= allowed_members THEN
        RAISE EXCEPTION 'Maximum family members exceeded for this plan';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_max_family_members() OWNER TO postgres;

--
-- Name: validate_policy_active(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_policy_active() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    start_dt DATE;
    end_dt DATE;
    active BOOLEAN;
BEGIN
    -- Get policy details
    SELECT start_date, end_date, is_active
    INTO start_dt, end_dt, active
    FROM Policys
    WHERE policy_id = NEW.policy_id;

    -- Check active flag
    IF active = FALSE THEN
        RAISE EXCEPTION 'Policy is inactive';
    END IF;

    -- Check date validity
    IF NEW.claim_date < start_dt OR NEW.claim_date > end_dt THEN
        RAISE EXCEPTION 'Claim date is outside policy coverage period';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_policy_active() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agentlearninglog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agentlearninglog (
    log_id integer NOT NULL,
    agent_name character varying(50) NOT NULL,
    claim_id integer,
    ai_decision character varying(20),
    human_decision character varying(20),
    notes text,
    logged_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.agentlearninglog OWNER TO postgres;

--
-- Name: agentlearninglog_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agentlearninglog_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agentlearninglog_log_id_seq OWNER TO postgres;

--
-- Name: agentlearninglog_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agentlearninglog_log_id_seq OWNED BY public.agentlearninglog.log_id;


--
-- Name: agentledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agentledger (
    ledger_id integer NOT NULL,
    agent_name character varying(60) NOT NULL,
    tool_name character varying(60) NOT NULL,
    caller character varying(120) DEFAULT 'okx.ai'::character varying,
    compute_cost_usd numeric(10,6) NOT NULL,
    price_charged_usdt numeric(10,4) NOT NULL,
    margin_usdt numeric(10,6) NOT NULL,
    latency_ms integer DEFAULT 0,
    success boolean DEFAULT true,
    invoked_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.agentledger OWNER TO postgres;

--
-- Name: agentledger_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agentledger_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agentledger_ledger_id_seq OWNER TO postgres;

--
-- Name: agentledger_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agentledger_ledger_id_seq OWNED BY public.agentledger.ledger_id;


--
-- Name: claims; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.claims (
    claim_id integer NOT NULL,
    policy_id integer NOT NULL,
    hospital_id integer NOT NULL,
    claim_date date NOT NULL,
    claim_amount numeric(10,2) NOT NULL,
    disease character varying(100),
    status character varying(20) DEFAULT 'Pending'::public.claim_status,
    doctor_name character varying(100),
    description text,
    ai_decision character varying(20),
    ai_reasoning text,
    ai_confidence numeric(5,2),
    fraud_score integer,
    tx_hash character varying(100),
    CONSTRAINT claims_claim_amount_check CHECK ((claim_amount > (0)::numeric))
);


ALTER TABLE public.claims OWNER TO postgres;

--
-- Name: claims_claim_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.claims_claim_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.claims_claim_id_seq OWNER TO postgres;

--
-- Name: claims_claim_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.claims_claim_id_seq OWNED BY public.claims.claim_id;


--
-- Name: customer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer (
    customer_id integer NOT NULL,
    customer_name character varying(100) NOT NULL,
    customer_email character varying(150) NOT NULL,
    customer_phone character varying(15) NOT NULL,
    gender character varying(10),
    age integer,
    city character varying(50),
    profession character varying(50),
    blood_group character varying(5),
    historical_disease text,
    password character varying(255) DEFAULT 'password123'::character varying,
    risk_score numeric(5,4) DEFAULT 0.0,
    wallet_address character varying(100),
    CONSTRAINT customer_age_check CHECK (((age > 0) AND (age < 150)))
);


ALTER TABLE public.customer OWNER TO postgres;

--
-- Name: customer_customer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_customer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_customer_id_seq OWNER TO postgres;

--
-- Name: customer_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_customer_id_seq OWNED BY public.customer.customer_id;


--
-- Name: familymember; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.familymember (
    member_id integer NOT NULL,
    policy_id integer NOT NULL,
    member_name character varying(100) NOT NULL,
    relation character varying(20) NOT NULL,
    age integer,
    gender character varying(10),
    CONSTRAINT familymember_age_check CHECK (((age > 0) AND (age < 150)))
);


ALTER TABLE public.familymember OWNER TO postgres;

--
-- Name: familymember_member_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.familymember_member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.familymember_member_id_seq OWNER TO postgres;

--
-- Name: familymember_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.familymember_member_id_seq OWNED BY public.familymember.member_id;


--
-- Name: hospital; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hospital (
    hospital_id integer NOT NULL,
    hospital_name character varying(150) NOT NULL,
    city character varying(50) NOT NULL,
    is_cashless boolean DEFAULT false NOT NULL
);


ALTER TABLE public.hospital OWNER TO postgres;

--
-- Name: hospital_hospital_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hospital_hospital_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hospital_hospital_id_seq OWNER TO postgres;

--
-- Name: hospital_hospital_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hospital_hospital_id_seq OWNED BY public.hospital.hospital_id;


--
-- Name: insuranceplan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insuranceplan (
    plan_id integer NOT NULL,
    plan_name character varying(100) NOT NULL,
    premium_amount numeric(10,2) NOT NULL,
    coverage_amount numeric(12,2) NOT NULL,
    max_members integer NOT NULL,
    policy_duration integer DEFAULT 1,
    CONSTRAINT insuranceplan_max_members_check CHECK ((max_members > 0)),
    CONSTRAINT insuranceplan_policy_duration_check CHECK ((policy_duration > 0))
);


ALTER TABLE public.insuranceplan OWNER TO postgres;

--
-- Name: insuranceplan_plan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.insuranceplan_plan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insuranceplan_plan_id_seq OWNER TO postgres;

--
-- Name: insuranceplan_plan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.insuranceplan_plan_id_seq OWNED BY public.insuranceplan.plan_id;


--
-- Name: patientinterventions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patientinterventions (
    intervention_id integer NOT NULL,
    customer_id integer NOT NULL,
    risk_score numeric(5,4),
    risk_factors jsonb,
    care_plan jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_read boolean DEFAULT false
);


ALTER TABLE public.patientinterventions OWNER TO postgres;

--
-- Name: patientinterventions_intervention_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patientinterventions_intervention_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patientinterventions_intervention_id_seq OWNER TO postgres;

--
-- Name: patientinterventions_intervention_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patientinterventions_intervention_id_seq OWNED BY public.patientinterventions.intervention_id;


--
-- Name: planhospital; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.planhospital (
    plan_id integer NOT NULL,
    hospital_id integer NOT NULL
);


ALTER TABLE public.planhospital OWNER TO postgres;

--
-- Name: policys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.policys (
    policy_id integer NOT NULL,
    customer_id integer NOT NULL,
    plan_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true,
    renewal_count integer DEFAULT 0
);


ALTER TABLE public.policys OWNER TO postgres;

--
-- Name: policys_policy_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.policys_policy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.policys_policy_id_seq OWNER TO postgres;

--
-- Name: policys_policy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.policys_policy_id_seq OWNED BY public.policys.policy_id;


--
-- Name: agentlearninglog log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agentlearninglog ALTER COLUMN log_id SET DEFAULT nextval('public.agentlearninglog_log_id_seq'::regclass);


--
-- Name: agentledger ledger_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agentledger ALTER COLUMN ledger_id SET DEFAULT nextval('public.agentledger_ledger_id_seq'::regclass);


--
-- Name: claims claim_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claims ALTER COLUMN claim_id SET DEFAULT nextval('public.claims_claim_id_seq'::regclass);


--
-- Name: customer customer_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer ALTER COLUMN customer_id SET DEFAULT nextval('public.customer_customer_id_seq'::regclass);


--
-- Name: familymember member_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familymember ALTER COLUMN member_id SET DEFAULT nextval('public.familymember_member_id_seq'::regclass);


--
-- Name: hospital hospital_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hospital ALTER COLUMN hospital_id SET DEFAULT nextval('public.hospital_hospital_id_seq'::regclass);


--
-- Name: insuranceplan plan_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insuranceplan ALTER COLUMN plan_id SET DEFAULT nextval('public.insuranceplan_plan_id_seq'::regclass);


--
-- Name: patientinterventions intervention_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patientinterventions ALTER COLUMN intervention_id SET DEFAULT nextval('public.patientinterventions_intervention_id_seq'::regclass);


--
-- Name: policys policy_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policys ALTER COLUMN policy_id SET DEFAULT nextval('public.policys_policy_id_seq'::regclass);


--
-- Data for Name: agentlearninglog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agentlearninglog (log_id, agent_name, claim_id, ai_decision, human_decision, notes, logged_at) FROM stdin;
\.


--
-- Data for Name: agentledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agentledger (ledger_id, agent_name, tool_name, caller, compute_cost_usd, price_charged_usdt, margin_usdt, latency_ms, success, invoked_at) FROM stdin;
1	ClearClaim AI	score_fraud	okx-test-agent	0.000100	0.0200	0.019900	767	t	2026-07-14 07:35:53.208831+05:30
2	ClearClaim AI	graph_adjudicate	okx.ai	0.005600	0.7500	0.744400	8295	t	2026-07-14 07:36:01.976768+05:30
3	ClearClaim AI	predictive_risk_scan	okx.ai	0.006600	0.2500	0.243400	66283	t	2026-07-14 18:26:58.03457+05:30
4	ClearClaim AI	hospital_preauth	integration-test	0.006100	0.3000	0.293900	66	t	2026-07-14 18:50:09.748923+05:30
5	ClearClaim AI	orchestrate_claim	okx.ai	0.019100	0.7500	0.730900	609	f	2026-07-14 19:01:14.072686+05:30
6	ClearClaim AI	orchestrate_claim	okx.ai	0.019100	0.7500	0.730900	30063	t	2026-07-14 19:03:02.048868+05:30
\.


--
-- Data for Name: claims; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.claims (claim_id, policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description, ai_decision, ai_reasoning, ai_confidence, fraud_score, tx_hash) FROM stdin;
1	1001	1	2026-05-01	18000.00	Viral Fever	Approved	Dr. Sameer Naik	High fever and dehydration	\N	\N	\N	\N	\N
2	1001	3	2026-06-10	45000.00	Minor Surgery	Rejected	Dr. Shantaram Zingate	Surgery not covered	\N	\N	\N	\N	\N
3	1002	1	2026-03-15	8000.00	Severe Cold	Approved	Dr. R. Monohar	Cold with breathing issue	\N	\N	\N	\N	\N
4	1004	4	2026-07-10	60000.00	Fracture Injury	Approved	Dr. A. Ambachore	Accidental fracture treatment	\N	\N	\N	\N	\N
8	1001	1	2026-05-23	20000.00	Fever	Approved	Dr.Smith	High Fever	\N	\N	\N	\N	\N
9	1010	1	2026-05-24	5000.00	Fever	Rejected	Dr. Rahul	High Cold & Fever	\N	\N	\N	\N	\N
18	1001	1	2026-07-08	45000.00	Appendicitis Surgery	Approved	Dr. Kavya Nair	Acute appendicitis requiring emergency laparoscopic surgery. 3 days hospitalization.	Approve	The claim for 'Appendicitis Surgery' is considered a common acute illness as per Evaluation Rule 6, and does not suggest a pre-existing condition that would conflict with the customer's historical profile (Rule 1). The policy has been active for 101 days, which is beyond the 90-day temporal fraud threshold (Rule 2). The claimed amount of ₹45000.0 is well within the remaining coverage of ₹850000.0 (Rule 3). The hospital is plan-approved (Rule 4). The claim amount is not a large percentage of the total coverage (Rule 5). All conditions for a legitimate claim are met.	0.98	\N	\N
16	1004	4	2026-07-08	38000.00	Bone Fracture	Approved	Dr. Suresh Patil	Right arm fracture due to fall. Plaster cast and physiotherapy required.	Approve	The claim for 'Bone Fracture' is a common acute illness, explicitly listed under legitimate claims criteria. The customer has no historical pre-existing diseases, so Rule 1 (Disease Mismatch) does not apply. The policy has been active for 138 days, exceeding the 90-day threshold for Rule 2 (Temporal Fraud). The claim amount of ₹38000.0 is well within the remaining coverage of ₹1440000.0, so Rule 3 (Coverage Check) is not triggered. The hospital is plan-approved, satisfying Rule 4. The claim amount is not greater than 70% of the total coverage (₹38000.0 < ₹1050000.0), so Rule 5 (Large Amount) does not apply. All conditions for Rule 6 (Legitimate Claims) are met, leading to approval.	1.00	\N	\N
14	1005	3	2026-07-08	630000.00	Kidney Transplant	Rejected	Dr. Amit Kulkarni	Kidney failure requiring transplant. Patient admitted emergency ward.	Flag	The claim is flagged due to multiple indicators:\n1.  **Rule 3 (Disease Mismatch - HIGH FRAUD):** The claimed diagnosis of 'Kidney Transplant' strongly implies a pre-existing condition, yet the customer's historical pre-existing diseases are listed as 'No'. This raises a significant concern about disease mismatch and potential non-disclosure.\n2.  **Rule 4 (Temporal Fraud - MODERATE):** The claim was submitted 72 days after the policy start date, which falls within the 90-day temporal fraud window for claims exceeding Rs50000 (Claim Amount: Rs630000.0).	0.95	75	f67fd7ab5e091dd746a7c3a412bd6c3e5bb6d776f6ebad1f63aa4a7e6feed5bc
17	1003	4	2026-07-08	480000.00	Cancer Treatment	Rejected	Dr. Anil Joshi	Chemotherapy sessions for Stage 2 lung cancer. 3 month treatment plan.	Flag	The claimed disease, Stage 2 lung cancer treatment, implies a severe condition. However, the customer's historical pre-existing disease record states 'No' historical pre-existing diseases. This discrepancy triggers the Disease Mismatch rule (Rule 3), indicating potential high fraud.	0.90	65	245ae8f9a0c16277ab5975323fb2d6af3f090e4388e7360ba0079274f892dc27
15	1001	2	2026-07-08	12000.00	Viral Fever	Approved	Dr. Priya Sharma	High fever with body ache. IV fluids and 2 day hospitalization.	Approve	The claim for 'Viral Fever' is a common acute illness and does not conflict with the customer's historical pre-existing diseases. The policy has been active for 101 days, which is past the 90-day temporal fraud threshold. The claim amount of ₹12000 is well within the remaining coverage of ₹862000.0 and is considered reasonable for a 2-day hospitalization due to viral fever. The hospital is also plan-approved. Based on evaluation rule 6, this claim is legitimate and qualifies for approval.	0.99	\N	\N
12	1013	2	2026-05-29	30000.00	Lever Damage	Approved	Dr. Shah	\N	Approve	The claim is approved because the hospital is plan-approved (Rule 1 not triggered) and the claim amount (Rs30000.0) is well within the remaining coverage (Rs1000000.0) (Rule 2 not triggered). The disease 'Lever Damage' (interpreted as Liver Damage) is not among the specific high-fraud pre-existing conditions (cardiac, cancer, transplant, bypass) as per Rule 3. Although the policy started recently (43 days since policy start), the claim amount of Rs30000.0 does not exceed the Rs50000 threshold for temporal fraud (Rule 4 not triggered). The claim amount is also significantly less than 70% of the total coverage, so Rule 5 is not triggered. As no rules for rejection or flagging were met, the claim is deemed legitimate under Rule 6.	0.95	\N	1c631a46b45c9eec248fa1afe4368931716ee84aebb03a8132dec62ede9b6f93
19	1001	2	2026-07-09	700000.00	kidney stone	Approved	Dr. Priya	\N	Approve	The claim is approved because the hospital is plan-approved (Rule 1 passed), the claim amount (Rs700000.0) is within the remaining coverage (Rs905000.0) (Rule 2 passed), the claimed disease 'kidney stone' does not imply a pre-existing condition (Rule 3 passed), the claim was made 95 days after policy start, exceeding the 90-day temporal fraud window (Rule 4 passed). Additionally, the claim amount (Rs700000.0) is not strictly greater than 70% of the total coverage (Rs1000000.0 * 0.70 = Rs700000.0), so Rule 5 for large amounts was not triggered. Finally, kidney stones are considered a common acute illness, fulfilling the criteria for a legitimate claim (Rule 6).	0.95	\N	040262affda113fe637bec1d05682d7a1a9c4e8a500f724a99740db4e78fa193
13	1002	1	2026-07-08	95000.00	Cardiac Surgery	Approved	Dr. Rajesh Mehta	Bypass surgery for blocked arteries. Emergency admission.	Approve	1. Hospital Validity (Rule 1): Hospital is Plan-Approved (True), so no auto-rejection.\n2. Coverage Check (Rule 2): Claim amount (Rs95000.0) is less than remaining coverage (Rs492000.0), so no auto-rejection.\n3. Disease Mismatch (Rule 3): The claimed disease (Cardiac Surgery/Bypass) implies a pre-existing condition. However, the historical pre-existing disease is Diabetes, which is a known major risk factor and often directly related to cardiac conditions like blocked arteries. Therefore, the condition 'historical_disease is No or unrelated' is not met, and this rule does not trigger a Flag or Reject.\n4. Temporal Fraud (Rule 4): Days Since Policy Start (191) is not within 90 days of policy start, so this rule does not apply.\n5. Large Amount (Rule 5): Claim amount (Rs95000.0) is not greater than 70% of total coverage (Rs350000.0), so no flag is triggered.\n6. Legitimate (Rule 6): No other rules triggered rejection or flagging. The hospital is valid, the amount is reasonable for the procedure, and it is within coverage. Thus, the claim is approved.	0.98	15	3155dc08dead0046e9c33d40c5d62cb62c2bd5637323281270a7f1f5540faff7
32	1003	4	2026-07-15	150000.00	Jondics	Approved	Dr. Dhiraj	[Payout: OKX Wallet 0x9868…7a6f]	\N	\N	\N	0	\N
27	1002	1	2026-07-14	40000.00	Viral Fever	Approved	Dr. Mehta	High fever 5 days, hospitalization 2 days, IV fluids	Approve	The claim is for a common acute illness (Viral Fever) treated at a plan-approved hospital, with the claim amount well within the remaining coverage and past the 30-day waiting period.	0.98	35	2c20cdc491e023ca7dad6f8ddb3c99ccbba93ad071cd09ed7cdce759d7b268f5
21	1014	2	2026-07-12	5000.00	Viral Fever	Rejected	Dr. Hatti	\N	Reject	Auto-rejected by IRDAI rules engine — Clause 5.1 — 30-day initial waiting period applies to all non-accidental claims. Claim filed 4 days after policy start (minimum 30 required).	0.99	35	3ca478ad00f63b38a292987ac55fc3bc86826398d635a71276d7b166abb5ce65
23	1001	1	2026-05-15	45000.00	Appendicitis	Approved	Dr. Sharma	\N	\N	\N	\N	\N	\N
28	1019	1	2026-07-14	15000.00	Audit Test Fever	Approved	Dr Audit	audit test	\N	\N	\N	\N	\N
24	1001	2	2026-06-20	5000.00	Dental Caries	Rejected	Dr. Patil	\N	Reject	Auto-rejected by IRDAI rules engine — IRDAI Standard Exclusion List — 'dental' is permanently excluded from coverage. Claimed condition 'Dental Caries' matches permanent exclusion 'dental'.	0.99	\N	\N
29	1019	1	2026-07-14	12000.00	Audit Reject Case	Rejected	Dr Audit	\N	\N	\N	\N	\N	\N
26	1002	1	2026-07-14	85000.00	Fracture	Approved	Dr. Crash Test	Road accident, leg fracture surgery	Approve	LLM unavailable and fraud score 35/100 — flagged for mandatory human review. [Admin notes: Accident fracture verified from discharge summary] [Overridden/confirmed by human admin: Approve]	1.00	35	2aa325229f41000a9fa3c4b50edf3afb41ced9a97db46168fc97920b6c9e65f4
31	1021	3	2026-07-15	2000000.00	Fatty Liver	Rejected	Dr. Hemant	[Payout: Bank Transfer (INR)]	Reject	Auto-rejected by IRDAI rules engine — Clause 5.1 — 30-day initial waiting period applies to all non-accidental claims. Claim filed 1 days after policy start (minimum 30 required).	0.99	60	a6f4cc4657fe79daf7895b1ce4b746e42027c51184a7095901144d43ed0a3585
30	1020	1	2026-07-15	55000.00	Leg fracture from road accident	Approved	Dr. Rao	RTA closed reduction cast 2-day admission	Approve	The claim triggers the temporal fraud rule due to being filed on day 0 of the policy for an amount exceeding Rs50,000. The deterministic payable amount is calculated at Rs55,000. [Admin notes: FIR verified] [Overridden/confirmed by human admin: Approve]	1.00	35	336accd8d08f75a461e35a7b53504c85c2b1359248bd34664a0e2633adfec1c7
25	1002	1	2026-07-14	60000.00	Appendicitis	Approved	Dr. Test	Emergency appendectomy, 3-day stay	Approve	Rule-based fallback (LLM unavailable): fraud score 25/100 (low), network hospital, within coverage. Payable ₹60,000 per IRDAI policy math. [Admin notes: Verified discharge summary manually] [Overridden/confirmed by human admin: Approve]	1.00	35	\N
20	1015	2	2026-07-12	500000.00	Appendices	Rejected	Dr. Rohit Sharma	\N	Reject	The claim is rejected under Clause 5.1 because the illness was diagnosed within the initial 30-day waiting period (policy started 2 days ago).	0.98	25	96372f57304bcf53b8d62e023ae474208ce57c6157da72b651aa9283c25bea35
\.


--
-- Data for Name: customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer (customer_id, customer_name, customer_email, customer_phone, gender, age, city, profession, blood_group, historical_disease, password, risk_score, wallet_address) FROM stdin;
106	Rohit Sharma	rohit@gmail.com	9876543210	Male	34	Mumbai	Architect	O+ve	Asthma	password123	0.0000	\N
114	Priya Journey	priya.journey@test.com	9876501234	Female	29	Mumbai	Engineer	B+ve	No	Test@1234	0.0500	\N
102	Amit Shekhare	amit@gmail.com	900340394	Male	35	Mumbai	Doctor	A+ve	Diabetes	password123	0.8500	\N
113	Audit Test	audit-test-0714@test.com	9998887771	Male	30	Pune	Engineer	O+ve	\N	Test@123	\N	\N
105	Neha Joshi	neha@gmail.com	900340394	Female	32	Pune	Doctor	B-ve	No	password123	0.0500	\N
103	Aditya Desai	aditya@gmail.com	900340394	Male	29	Pune	Engineer	O+ve	No	password123	0.4500	0x98682146fc566c9304dd57af9b5c2115af537a6f
104	Harshal Pawar	harshal@gmail.com	900340394	Male	40	Delhi	Teacher	AB+ve	No	password123	0.4000	\N
110	Hitesh Harma	hit@gmail.com	9876543211	Male	34	Mumbai	Engineering	O+ve	No	password123	0.0500	\N
101	Suyash Matade	suy@gmail.com	900340394	Male	21	Pune	Engineer	B+ve	No	password123	0.4000	0x98682146fc566c9304dd57af9b5c2115af537a6f
111	test	test@test.com	12345	Other	30	Unknown	Unknown	O+ve	None	pass	0.0000	\N
112	Prajwal Khaire	prajwal@gmail.com	9032930288	Other	30	Unknown	Unknown	O+ve	None	pass@123	0.0000	\N
\.


--
-- Data for Name: familymember; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.familymember (member_id, policy_id, member_name, relation, age, gender) FROM stdin;
2	1004	Sunita Pawar	Wife	38	Female
3	1004	Aryan Pawar	Son	10	Male
4	1004	Meena Pawar	Mother	65	Female
7	1001	Unknown Matade	Wife	30	Female
8	1001	ABC Matade	Son	10	Male
12	1018	Omkar Sarkar	Father	70	Male
13	1021	XYZ Desai	Wife	21	Female
\.


--
-- Data for Name: hospital; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hospital (hospital_id, hospital_name, city, is_cashless) FROM stdin;
1	Apollo Hospital	Pune	t
2	Ruby Hall Clinic	Pune	t
3	City Care Hospital	Mumbai	f
4	Max Hospital	Delhi	t
\.


--
-- Data for Name: insuranceplan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insuranceplan (plan_id, plan_name, premium_amount, coverage_amount, max_members, policy_duration) FROM stdin;
1	Personal Medical Insurance	7000.00	500000.00	1	1
2	Family Medical Insurance	18500.00	1000000.00	4	1
3	Parent Medical Insurance	68000.00	1500000.00	2	1
4	Complete Family Medical Insurance	38000.00	2500000.00	8	1
5	Premium Individual Insurance	24000.00	2500000.00	1	1
6	Super Floater Family Plan	42000.00	5000000.00	4	1
7	Senior Citizen Gold Plan	95000.00	2000000.00	2	1
9	Critical Illness Shield	14500.00	2000000.00	1	1
10	Maternity Care Plus	22000.00	1000000.00	2	1
11	Startup Employee Basic	4500.00	300000.00	1	1
12	Global Health Elite	125000.00	10000000.00	4	1
13	Ayush Alternative Care	5500.00	400000.00	1	1
\.


--
-- Data for Name: patientinterventions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patientinterventions (intervention_id, customer_id, risk_score, risk_factors, care_plan, created_at, is_read) FROM stdin;
3	104	0.6500	["Age 40", "Three claims in the past year (including two significant fractures)", "Uninvestigated underlying cause for fractures"]	{"summary": "Based on your recent health events and risk profile, we've designed a proactive 90-day plan to support your bone health and overall well-being.", "greeting": "Hi Harshal Pawar, your AI Health Guardian has a personalized message for you.", "lifestyle_tips": ["Prioritize a diet rich in calcium (e.g., dairy, fortified plant milks, leafy greens) and ensure adequate Vitamin D intake (e.g., fatty fish, fortified foods, safe sun exposure).", "Engage in regular, low-impact weight-bearing exercises (like walking) and balance-improving activities, after consulting your doctor for a tailored plan.", "Review your home environment for potential fall hazards (e.g., loose rugs, poor lighting) to enhance safety and prevent future incidents.", "Avoid smoking and limit alcohol consumption, as these habits can significantly weaken bones over time."], "urgency_message": "These are proactive, preventive steps to understand and strengthen your health. You are not in immediate danger, and taking early action is the best way to protect your well-being.", "estimated_savings": "Following this plan could help prevent claims worth Rs2-5L in the next 12 months by addressing the root cause of fractures and promoting long-term bone health.", "recommended_tests": [{"test": "Bone Mineral Density (BMD) Scan (DEXA)", "reason": "To assess bone strength and identify potential underlying causes for fractures, like osteopenia or osteoporosis.", "covered": true, "frequency": "Once (within 90 days)"}, {"test": "Blood Tests: Calcium, Vitamin D, Parathyroid Hormone (PTH)", "reason": "To evaluate levels of key nutrients and hormones crucial for bone health, which can contribute to fracture risk.", "covered": true, "frequency": "Once (within 90 days)"}, {"test": "Blood Test: Thyroid Stimulating Hormone (TSH)", "reason": "To screen for thyroid conditions that can impact bone metabolism and density.", "covered": true, "frequency": "Once (within 90 days)"}], "specialist_referral": "Based on your GP's assessment, consider a referral to an Orthopedic specialist or an Endocrinologist for expert evaluation of your bone health.", "doctor_recommendation": "Schedule a consultation with a General Physician within 2 weeks to discuss your recent fractures and the recommended preventive tests."}	2026-07-11 10:23:05.485001	f
1	101	0.7000	["Age 21 (despite typically low risk for age, overridden by recent events)", "High claims frequency (5 claims in past 12 months)", "Recent severe kidney stone event (Rs 700,000 cost, high recurrence risk)", "Recent major surgeries (appendicitis, minor surgery)", "Multiple fever episodes indicating general susceptibility"]	{"summary": "Based on your profile and recent health events, we've designed a proactive 90-day plan to support your well-being, reduce future health risks, and help you stay on top of your health.", "greeting": "Hi Suyash Matade, your AI Health Guardian has a personalized message for you.", "lifestyle_tips": ["Ensure consistent daily water intake of 2.5-3 liters (unless advised otherwise by your doctor) to help prevent kidney stone formation.", "Reduce sodium intake to less than 2g per day and limit processed foods to support kidney health and overall well-being.", "Adopt a balanced diet rich in fresh fruits and vegetables, and moderate your intake of animal protein.", "Aim for at least 30 minutes of moderate physical activity, like brisk walking, most days of the week to boost your immune system and overall fitness.", "Prioritize adequate sleep (7-9 hours per night) to support your body's recovery and enhance your natural immunity.", "Schedule an annual full-body health checkup to monitor your health proactively."], "urgency_message": "These are proactive preventive steps only, designed to safeguard your future health. You are not in immediate danger. Early action protects your well-being and helps you maintain a healthy lifestyle.", "estimated_savings": "Following this comprehensive plan could help prevent claims worth Rs3-7L in the next 12-18 months by significantly reducing the risk of kidney stone recurrence and other general health issues.", "recommended_tests": [{"test": "Urine Analysis (Microscopy & Culture)", "reason": "To monitor kidney health, check for crystal formation, and potential infection which can contribute to stone recurrence.", "covered": true, "frequency": "Once in 90 days, or as advised by your doctor."}, {"test": "Kidney Function Test (KFT - Creatinine, BUN)", "reason": "To assess and monitor your kidney function after a severe stone event.", "covered": true, "frequency": "Once in 90 days."}, {"test": "Serum Calcium and Uric Acid", "reason": "To identify potential metabolic factors that could contribute to kidney stone formation.", "covered": true, "frequency": "Once in 90 days."}, {"test": "Complete Blood Count (CBC)", "reason": "General health check-up, helps assess your overall recovery and immune status after multiple health events.", "covered": true, "frequency": "Once in 90 days."}, {"test": "ECG (Electrocardiogram)", "reason": "A baseline cardiac check, especially important after recent surgeries and to ensure overall wellness.", "covered": true, "frequency": "Once."}], "specialist_referral": "Consider consulting a Urologist within 3-4 weeks to discuss specific kidney stone prevention strategies, potential stone analysis, and long-term kidney health management.", "doctor_recommendation": "Schedule a consultation with your General Physician within 2 weeks to discuss this preventive plan and your recent health journey."}	2026-07-11 10:36:42.914994	f
10	103	0.8500	["3 major claims in the past 12 months (Cancer, Fatty Liver, Jaundice)", "Extremely new policy (1 day active) with heavy pre-existing claim history", "High-cost treatment history relative to policy limits"]	{"summary": "To support your recovery and protect your liver health, this proactive 90-day plan focuses on gentle monitoring and metabolic wellness.", "greeting": "Hello Aditya, welcome to ClearClaim AI Health Guardian. We are delighted to partner with you from day one of your new policy to support your ongoing health journey.", "lifestyle_tips": ["Limit processed fats and avoid alcohol to aid liver healing and regeneration.", "Incorporate antioxidant-rich foods like leafy greens, berries, and garlic into your daily meals.", "Engage in 30 minutes of light-to-moderate exercise, such as walking or cycling, 5 days a week."], "urgency_message": "This plan consists of routine, preventive steps to keep you thriving. There is no immediate health risk.", "estimated_savings": "By prioritizing these preventive screenings, you can safeguard your health and avoid potential hospitalization claims worth Rs 3,00,000 - 5,00,000.", "recommended_tests": [{"test": "Liver Function Test (LFT)", "reason": "Monitor liver enzyme recovery and overall hepatic health.", "covered": true, "frequency": "Every 3 months"}, {"test": "Abdominal Ultrasound", "reason": "Assess and track fatty liver status to prevent progression.", "covered": true, "frequency": "Every 6 months"}, {"test": "Complete Blood Count (CBC)", "reason": "General health baseline check following your oncology recovery.", "covered": true, "frequency": "Once"}], "specialist_referral": "Consider a consultative follow-up with a Hepatologist or Gastroenterologist to proactively manage your liver recovery.", "doctor_recommendation": "Please schedule a routine consultation with a General Physician within the next 2 weeks to establish your baseline health plan."}	2026-07-15 02:37:03.092883	f
2	102	0.8500	["Recent cardiac surgery at age 35", "Pre-existing diabetes", "5 healthcare claims in the past 12 months"]	{"summary": "Following your recent cardiac surgery, we've designed a gentle 90-day plan to help you safely manage your diabetes and protect your heart health.", "greeting": "Hello Amit, I'm your ClearClaim AI Health Guardian, here to support you in your recovery and long-term wellness journey.", "lifestyle_tips": ["Engage in gentle, physician-approved physical activity, such as a slow 15-minute walk twice a day.", "Limit sodium intake to under 2 grams daily and focus on a low-glycemic, fiber-rich diet.", "Monitor and note down your blood pressure and blood sugar levels at home regularly.", "Practice stress-relief techniques like deep breathing or meditation for 10 minutes daily."], "urgency_message": "These are proactive, preventive measures to support your healing journey. You are not in immediate danger, and taking these gentle steps now keeps you safe.", "estimated_savings": "Staying proactive with this plan can help you prevent complications and save an estimated Rs1,50,000 to Rs3,00,000 in future out-of-pocket medical expenses.", "recommended_tests": [{"test": "HbA1c Blood Test", "reason": "To monitor your blood sugar levels and ensure stable diabetes management during your recovery.", "covered": true, "frequency": "Every 3 months"}, {"test": "Lipid Profile", "reason": "To track your cholesterol levels and ensure optimal protection for your cardiovascular system.", "covered": true, "frequency": "Once in 3 months"}, {"test": "Fasting Blood Sugar & PPBS", "reason": "To track daily glycemic control and prevent sudden fluctuations.", "covered": true, "frequency": "Bi-weekly"}, {"test": "Electrocardiogram (ECG)", "reason": "A routine non-invasive check to monitor your heart's rhythm post-surgery.", "covered": true, "frequency": "As advised by your Cardiologist"}], "specialist_referral": "We highly recommend scheduling a coordinated follow-up with your Cardiologist and an Endocrinologist this month.", "doctor_recommendation": "Please schedule a routine follow-up with your General Physician within the next 14 days to review your general recovery."}	2026-07-15 02:37:54.124591	f
\.


--
-- Data for Name: planhospital; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.planhospital (plan_id, hospital_id) FROM stdin;
1	1
1	2
2	1
2	2
2	3
3	2
3	4
4	1
4	2
4	3
4	4
5	1
5	2
5	3
5	4
6	1
6	2
6	3
6	4
7	1
7	2
7	4
\.


--
-- Data for Name: policys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.policys (policy_id, customer_id, plan_id, start_date, end_date, is_active, renewal_count) FROM stdin;
1001	101	2	2026-04-07	2027-04-07	t	0
1002	102	1	2026-01-01	2027-01-01	t	0
1003	103	3	2026-02-01	2027-02-01	t	0
1004	104	4	2026-03-01	2027-03-01	t	0
1005	105	2	2026-05-01	2027-05-01	t	0
1006	104	2	2026-05-22	2027-05-22	t	0
1007	103	2	2026-05-22	2027-05-22	t	0
1008	103	4	2026-05-22	2027-05-22	t	0
1009	104	3	2026-05-22	2027-05-22	t	0
1010	104	1	2026-05-24	2027-05-24	t	0
1013	110	2	2026-05-29	2027-05-30	t	0
1014	101	3	2026-07-10	2027-07-10	t	0
1015	101	6	2026-07-12	2027-07-12	t	0
1016	101	7	2026-07-12	2027-07-12	t	0
1017	101	9	2026-07-12	2027-07-12	t	0
1018	101	12	2026-07-12	2027-07-12	t	0
1019	101	1	2026-07-14	2027-07-14	t	0
1020	114	1	2026-07-15	2027-07-15	t	0
1021	103	6	2026-07-14	2027-07-14	t	0
\.


--
-- Name: agentlearninglog_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agentlearninglog_log_id_seq', 1, false);


--
-- Name: agentledger_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agentledger_ledger_id_seq', 6, true);


--
-- Name: claims_claim_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.claims_claim_id_seq', 32, true);


--
-- Name: customer_customer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customer_customer_id_seq', 114, true);


--
-- Name: familymember_member_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.familymember_member_id_seq', 13, true);


--
-- Name: hospital_hospital_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.hospital_hospital_id_seq', 4, true);


--
-- Name: insuranceplan_plan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.insuranceplan_plan_id_seq', 13, true);


--
-- Name: patientinterventions_intervention_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patientinterventions_intervention_id_seq', 11, true);


--
-- Name: policys_policy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.policys_policy_id_seq', 1021, true);


--
-- Name: agentlearninglog agentlearninglog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agentlearninglog
    ADD CONSTRAINT agentlearninglog_pkey PRIMARY KEY (log_id);


--
-- Name: agentledger agentledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agentledger
    ADD CONSTRAINT agentledger_pkey PRIMARY KEY (ledger_id);


--
-- Name: claims claims_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_pkey PRIMARY KEY (claim_id);


--
-- Name: customer customer_customer_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT customer_customer_email_key UNIQUE (customer_email);


--
-- Name: customer customer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT customer_pkey PRIMARY KEY (customer_id);


--
-- Name: familymember familymember_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familymember
    ADD CONSTRAINT familymember_pkey PRIMARY KEY (member_id);


--
-- Name: hospital hospital_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hospital
    ADD CONSTRAINT hospital_pkey PRIMARY KEY (hospital_id);


--
-- Name: insuranceplan insuranceplan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insuranceplan
    ADD CONSTRAINT insuranceplan_pkey PRIMARY KEY (plan_id);


--
-- Name: patientinterventions patientinterventions_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patientinterventions
    ADD CONSTRAINT patientinterventions_customer_id_key UNIQUE (customer_id);


--
-- Name: patientinterventions patientinterventions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patientinterventions
    ADD CONSTRAINT patientinterventions_pkey PRIMARY KEY (intervention_id);


--
-- Name: planhospital planhospital_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planhospital
    ADD CONSTRAINT planhospital_pkey PRIMARY KEY (plan_id, hospital_id);


--
-- Name: policys policys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policys
    ADD CONSTRAINT policys_pkey PRIMARY KEY (policy_id);


--
-- Name: hospital uq_hospital; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hospital
    ADD CONSTRAINT uq_hospital UNIQUE (hospital_name, city);


--
-- Name: familymember trg_prevent_duplicate_relation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_duplicate_relation BEFORE INSERT ON public.familymember FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_relation();


--
-- Name: claims trg_validate_claim_amount; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validate_claim_amount BEFORE INSERT ON public.claims FOR EACH ROW EXECUTE FUNCTION public.validate_claim_amount();


--
-- Name: claims trg_validate_claim_hospital; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validate_claim_hospital BEFORE INSERT ON public.claims FOR EACH ROW EXECUTE FUNCTION public.validate_claim_hospital();


--
-- Name: familymember trg_validate_family_age; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validate_family_age BEFORE INSERT ON public.familymember FOR EACH ROW EXECUTE FUNCTION public.validate_family_age();


--
-- Name: familymember trg_validate_family_relation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validate_family_relation BEFORE INSERT ON public.familymember FOR EACH ROW EXECUTE FUNCTION public.validate_family_relation();


--
-- Name: familymember trg_validate_max_family; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validate_max_family BEFORE INSERT ON public.familymember FOR EACH ROW EXECUTE FUNCTION public.validate_max_family_members();


--
-- Name: claims trg_validate_policy_active; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validate_policy_active BEFORE INSERT ON public.claims FOR EACH ROW EXECUTE FUNCTION public.validate_policy_active();


--
-- Name: claims fk_claim_hospital; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT fk_claim_hospital FOREIGN KEY (hospital_id) REFERENCES public.hospital(hospital_id) ON DELETE RESTRICT;


--
-- Name: claims fk_claim_policy; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT fk_claim_policy FOREIGN KEY (policy_id) REFERENCES public.policys(policy_id) ON DELETE CASCADE;


--
-- Name: familymember fk_familymember_policy; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familymember
    ADD CONSTRAINT fk_familymember_policy FOREIGN KEY (policy_id) REFERENCES public.policys(policy_id) ON DELETE CASCADE;


--
-- Name: planhospital fk_planhospital_hospital; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planhospital
    ADD CONSTRAINT fk_planhospital_hospital FOREIGN KEY (hospital_id) REFERENCES public.hospital(hospital_id) ON DELETE CASCADE;


--
-- Name: planhospital fk_planhospital_plan; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planhospital
    ADD CONSTRAINT fk_planhospital_plan FOREIGN KEY (plan_id) REFERENCES public.insuranceplan(plan_id) ON DELETE CASCADE;


--
-- Name: policys fk_policy_customer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policys
    ADD CONSTRAINT fk_policy_customer FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id) ON DELETE CASCADE;


--
-- Name: policys fk_policy_plan; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policys
    ADD CONSTRAINT fk_policy_plan FOREIGN KEY (plan_id) REFERENCES public.insuranceplan(plan_id) ON DELETE RESTRICT;


--
-- Name: patientinterventions patientinterventions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patientinterventions
    ADD CONSTRAINT patientinterventions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id);


--
-- PostgreSQL database dump complete
--

\unrestrict 44mZHFhac6o8FHe4FXXCVCBgrXVu7lyXAzoQ1BimTRr4BWJweVagBo7VegZtG3u


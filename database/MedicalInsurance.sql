-- =============================================================================
-- ClearClaim — Full Database Schema (Restructured - Correct Dependency Order)
-- Database: Medical_Insurance (PostgreSQL 16)
-- Tables created in order: Independent → Dependent
-- Independent:  Customer, InsurancePlan, Hospital
-- Dependent L1: Policys (needs Customer + InsurancePlan)
--               PlanHospital (needs InsurancePlan + Hospital)
-- Dependent L2: FamilyMember (needs Policys)
--               Claims (needs Policys + Hospital)
-- =============================================================================

CREATE DATABASE Medical_Insurance;

-- =============================================================================
-- DROP in REVERSE dependency order (children before parents)
-- =============================================================================
DROP TABLE IF EXISTS Claims;
DROP TABLE IF EXISTS FamilyMember;
DROP TABLE IF EXISTS PlanHospital;
DROP TABLE IF EXISTS Policys;
DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS InsurancePlan;
DROP TABLE IF EXISTS Hospital;
DROP TYPE IF EXISTS claim_status;

-- =============================================================================
-- LAYER 1: Independent tables (no foreign keys)
-- =============================================================================

-- Customer: root entity, holds all personal + medical history
CREATE TABLE Customer (
    customer_id   SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(150) UNIQUE NOT NULL,
    customer_phone VARCHAR(15) NOT NULL,
    gender        VARCHAR(10),
    age           INT CHECK (age > 0 AND age < 150),
    city          VARCHAR(50),
    profession    VARCHAR(50),
    blood_group   VARCHAR(5),
    historical_disease TEXT,
    password      VARCHAR(255) DEFAULT 'password123'  -- Added for auth
);

-- InsurancePlan: master plan catalog
-- numeric(10,2) = 10 digits total, 2 after decimal
CREATE TABLE InsurancePlan (
    plan_id         SERIAL PRIMARY KEY,
    plan_name       VARCHAR(100) NOT NULL,
    premium_amount  NUMERIC(10, 2) NOT NULL,
    coverage_amount NUMERIC(12, 2) NOT NULL,
    max_members     INT NOT NULL CHECK (max_members > 0),
    policy_duration INT DEFAULT 1 CHECK (policy_duration > 0)
);

-- Hospital: network hospitals
CREATE TABLE Hospital (
    hospital_id   SERIAL PRIMARY KEY,
    hospital_name VARCHAR(150) NOT NULL,
    city          VARCHAR(50) NOT NULL,
    is_cashless   BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_hospital UNIQUE (hospital_name, city)
);

-- =============================================================================
-- LAYER 2: Tables with FK to Layer 1
-- =============================================================================

-- Policys: Customer purchases a Plan → creates a Policy
-- Customer → Policy: 1 to many
-- Policy → InsurancePlan: many to 1
CREATE TABLE Policys (
    policy_id    SERIAL PRIMARY KEY,
    customer_id  INT NOT NULL,
    plan_id      INT NOT NULL,
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    is_active    BOOLEAN DEFAULT TRUE,
    renewal_count INT DEFAULT 0,

    CONSTRAINT fk_policy_customer
        FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_policy_plan
        FOREIGN KEY (plan_id) REFERENCES InsurancePlan(plan_id) ON DELETE RESTRICT
);

-- PlanHospital: many-to-many junction — which hospitals each plan covers
CREATE TABLE PlanHospital (
    plan_id     INT NOT NULL,
    hospital_id INT NOT NULL,
    PRIMARY KEY (plan_id, hospital_id),

    CONSTRAINT fk_planhospital_plan
        FOREIGN KEY (plan_id) REFERENCES InsurancePlan(plan_id) ON DELETE CASCADE,
    CONSTRAINT fk_planhospital_hospital
        FOREIGN KEY (hospital_id) REFERENCES Hospital(hospital_id) ON DELETE CASCADE
);

-- =============================================================================
-- LAYER 3: Tables with FK to Layer 2
-- =============================================================================

-- FamilyMember: members added under a Policy
CREATE TABLE FamilyMember (
    member_id   SERIAL PRIMARY KEY,
    policy_id   INT NOT NULL,
    member_name VARCHAR(100) NOT NULL,
    relation    VARCHAR(20) NOT NULL,
    age         INT CHECK (age > 0 AND age < 150),
    gender      VARCHAR(10),

    CONSTRAINT fk_familymember_policy
        FOREIGN KEY (policy_id) REFERENCES Policys(policy_id) ON DELETE CASCADE
);

-- Claims: submitted under a Policy at a Hospital
-- AI agent writes to: ai_decision, ai_reasoning, ai_confidence, fraud_score, tx_hash
CREATE TABLE Claims (
    claim_id      SERIAL PRIMARY KEY,
    policy_id     INT NOT NULL,
    hospital_id   INT NOT NULL,
    claim_date    DATE NOT NULL,
    claim_amount  NUMERIC(10, 2) NOT NULL CHECK (claim_amount > 0),
    disease       VARCHAR(100),
    status        VARCHAR(20) DEFAULT 'Pending',
    doctor_name   VARCHAR(100),
    description   TEXT,

    -- AI Agent output columns (populated by Python FastAPI agents)
    ai_decision   VARCHAR(20),          -- 'Approve' | 'Reject' | 'Flag'
    ai_reasoning  TEXT,                 -- Full AI explanation
    ai_confidence NUMERIC(5, 2),        -- 0.00 to 1.00
    fraud_score   INT,                  -- 0-100 risk score
    tx_hash       VARCHAR(100),         -- X Layer blockchain tx hash

    CONSTRAINT fk_claim_policy
        FOREIGN KEY (policy_id) REFERENCES Policys(policy_id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_hospital
        FOREIGN KEY (hospital_id) REFERENCES Hospital(hospital_id) ON DELETE RESTRICT
);

-- =============================================================================
-- DATA: InsurancePlan (4 plans)
-- =============================================================================
INSERT INTO InsurancePlan (plan_id, plan_name, premium_amount, coverage_amount, max_members, policy_duration)
VALUES
(1, 'Personal Medical Insurance',        7000,   500000, 1, 1),
(2, 'Family Medical Insurance',         10000,   900000, 4, 1),
(3, 'Parent Medical Insurance',         12000,  1000000, 2, 1),
(4, 'Complete Family Medical Insurance', 7000,  1500000, 8, 1);

-- =============================================================================
-- DATA: Hospital (4 hospitals)
-- =============================================================================
INSERT INTO Hospital (hospital_name, city, is_cashless)
VALUES
('Apollo Hospital',    'Pune',   TRUE),   -- id = 1
('Ruby Hall Clinic',   'Pune',   TRUE),   -- id = 2
('City Care Hospital', 'Mumbai', FALSE),  -- id = 3
('Max Hospital',       'Delhi',  TRUE);   -- id = 4

-- =============================================================================
-- DATA: Customer (5 customers with passwords)
-- =============================================================================
INSERT INTO Customer (customer_id, customer_name, customer_email, customer_phone, gender, age, city, profession, blood_group, historical_disease, password)
VALUES
(101, 'Suyash Matade',  'suy@gmail.com',    '900340394', 'Male',   21, 'Pune',   'Engineer', 'B+ve', 'No',       'password123'),
(102, 'Amit Shekhare',  'amit@gmail.com',   '900340394', 'Male',   35, 'Mumbai', 'Doctor',   'A+ve', 'Diabetes', 'password123'),
(103, 'Aditya Desai',   'aditya@gmail.com', '900340394', 'Male',   29, 'Pune',   'Engineer', 'O+ve', 'No',       'password123'),
(104, 'Harshal Pawar',  'harshal@gmail.com','900340394', 'Male',   40, 'Delhi',  'Teacher',  'AB+ve','No',       'password123'),
(105, 'Neha Joshi',     'neha@gmail.com',   '900340394', 'Female', 32, 'Pune',   'Doctor',   'B-ve', 'No',       'password123');

-- =============================================================================
-- DATA: Policys (1 per customer)
-- =============================================================================
INSERT INTO Policys (policy_id, customer_id, plan_id, start_date, end_date, is_active, renewal_count)
VALUES
(1001, 101, 2, '2026-04-07', '2027-04-07', TRUE, 0),  -- Suyash   → Family Plan
(1002, 102, 1, '2026-01-01', '2027-01-01', TRUE, 0),  -- Amit     → Personal Plan
(1003, 103, 3, '2026-02-01', '2027-02-01', TRUE, 0),  -- Aditya   → Parent Plan
(1004, 104, 4, '2026-03-01', '2027-03-01', TRUE, 0),  -- Harshal  → Complete Family
(1005, 105, 2, '2026-05-01', '2027-05-01', TRUE, 0);  -- Neha     → Family Plan

-- =============================================================================
-- DATA: FamilyMember
-- =============================================================================
INSERT INTO FamilyMember (policy_id, member_name, relation, age, gender)
VALUES
(1001, 'Unknown Matade', 'Wife',   20, 'Female'),
(1004, 'Sunita Pawar',   'Wife',   38, 'Female'),
(1004, 'Aryan Pawar',    'Son',    10, 'Male'),
(1004, 'Meena Pawar',    'Mother', 65, 'Female');

-- =============================================================================
-- DATA: PlanHospital (which hospitals each plan covers)
-- =============================================================================
-- Personal Plan (1): Apollo, Ruby Hall
INSERT INTO PlanHospital VALUES (1, 1), (1, 2);

-- Family Plan (2): Apollo, Ruby Hall, City Care
INSERT INTO PlanHospital VALUES (2, 1), (2, 2), (2, 3);

-- Parent Plan (3): Ruby Hall, Max Hospital
INSERT INTO PlanHospital VALUES (3, 2), (3, 4);

-- Complete Family Plan (4): All hospitals
INSERT INTO PlanHospital VALUES (4, 1), (4, 2), (4, 3), (4, 4);

-- =============================================================================
-- DATA: Claims — Historical (resolved) + Pending (for AI agent to process)
-- =============================================================================

-- --- Historical Claims (already resolved) ---
-- Suyash: viral fever → Approved
INSERT INTO Claims (claim_id, policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1, 1001, 1, '2026-05-01', 18000, 'Viral Fever', 'Approved', 'Dr. Sameer Naik', 'High fever and dehydration');

-- Suyash: minor surgery → Rejected
INSERT INTO Claims (claim_id, policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (2, 1001, 3, '2026-06-10', 45000, 'Minor Surgery', 'Rejected', 'Dr. Shantaram Zingate', 'Surgery not covered');

-- Amit: severe cold → Approved
INSERT INTO Claims (claim_id, policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (3, 1002, 1, '2026-03-15', 8000, 'Severe Cold', 'Approved', 'Dr. R. Monohar', 'Cold with breathing issue');

-- Harshal: fracture → Approved
INSERT INTO Claims (claim_id, policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (4, 1004, 4, '2026-07-01', 60000, 'Fracture Injury', 'Approved', 'Dr. A. Ambachore', 'Accidental fracture treatment');

-- --- PENDING Claims for AI Agent Demo ---

-- Claim 5: SUSPICIOUS — Amit has Diabetes history but claiming Cardiac Surgery → AI should REJECT/FLAG
INSERT INTO Claims (policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1002, 1, CURRENT_DATE, 95000, 'Cardiac Surgery', 'Pending', 'Dr. Rajesh Mehta',
        'Bypass surgery for blocked arteries. Emergency admission.');

-- Claim 6: SUSPICIOUS — Neha, very high amount (70% of 900K coverage) for kidney transplant
INSERT INTO Claims (policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1005, 3, CURRENT_DATE, 630000, 'Kidney Transplant', 'Pending', 'Dr. Amit Kulkarni',
        'Kidney failure requiring transplant. Patient admitted emergency ward.');

-- Claim 7: LEGITIMATE — Suyash, viral fever again, low amount, valid history
INSERT INTO Claims (policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1001, 2, CURRENT_DATE, 12000, 'Viral Fever', 'Pending', 'Dr. Priya Sharma',
        'High fever with body ache. IV fluids and 2 day hospitalization.');

-- Claim 8: LEGITIMATE — Harshal, bone fracture, valid hospital, no suspicious flags
INSERT INTO Claims (policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1004, 4, CURRENT_DATE, 38000, 'Bone Fracture', 'Pending', 'Dr. Suresh Patil',
        'Right arm fracture due to fall. Plaster cast and physiotherapy required.');

-- Claim 9: SUSPICIOUS — Aditya, no historical disease but claiming Cancer Treatment at 480K
INSERT INTO Claims (policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1003, 4, CURRENT_DATE, 480000, 'Cancer Treatment', 'Pending', 'Dr. Anil Joshi',
        'Chemotherapy for Stage 2 lung cancer. 3 month treatment plan.');

-- Claim 10: LEGITIMATE — Suyash, appendicitis emergency, valid, reasonable amount
INSERT INTO Claims (policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1001, 1, CURRENT_DATE, 45000, 'Appendicitis Surgery', 'Pending', 'Dr. Kavya Nair',
        'Acute appendicitis requiring emergency laparoscopic surgery. 3 days hospitalization.');

-- =============================================================================
-- TRIGGERS: Business rule enforcement
-- =============================================================================

-- Trigger 1: Hospital must be covered by the policy's plan
CREATE OR REPLACE FUNCTION validate_claim_hospital()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM Policys p
        JOIN PlanHospital ph ON p.plan_id = ph.plan_id
        WHERE p.policy_id = NEW.policy_id AND ph.hospital_id = NEW.hospital_id
    ) THEN
        RAISE EXCEPTION 'Hospital is not covered under this insurance plan';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_claim_hospital
BEFORE INSERT ON Claims
FOR EACH ROW EXECUTE FUNCTION validate_claim_hospital();

-- Trigger 2: Total approved claims must not exceed coverage
CREATE OR REPLACE FUNCTION validate_claim_amount()
RETURNS TRIGGER AS $$
DECLARE
    total_claimed NUMERIC;
    coverage      NUMERIC;
BEGIN
    SELECT ip.coverage_amount INTO coverage
    FROM Policys p JOIN InsurancePlan ip ON p.plan_id = ip.plan_id
    WHERE p.policy_id = NEW.policy_id;

    SELECT COALESCE(SUM(claim_amount), 0) INTO total_claimed
    FROM Claims WHERE policy_id = NEW.policy_id AND status = 'Approved';

    IF (total_claimed + NEW.claim_amount) > coverage THEN
        RAISE EXCEPTION 'Claim exceeds policy coverage limit';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_claim_amount
BEFORE INSERT ON Claims
FOR EACH ROW EXECUTE FUNCTION validate_claim_amount();

-- Trigger 3: Policy must be active and within date range
CREATE OR REPLACE FUNCTION validate_policy_active()
RETURNS TRIGGER AS $$
DECLARE
    start_dt DATE;
    end_dt   DATE;
    active   BOOLEAN;
BEGIN
    SELECT start_date, end_date, is_active INTO start_dt, end_dt, active
    FROM Policys WHERE policy_id = NEW.policy_id;

    IF active = FALSE THEN
        RAISE EXCEPTION 'Policy is inactive';
    END IF;
    IF NEW.claim_date < start_dt OR NEW.claim_date > end_dt THEN
        RAISE EXCEPTION 'Claim date is outside policy coverage period';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_policy_active
BEFORE INSERT ON Claims
FOR EACH ROW EXECUTE FUNCTION validate_policy_active();

-- Trigger 4: Cannot exceed max_members per plan
CREATE OR REPLACE FUNCTION validate_max_family_members()
RETURNS TRIGGER AS $$
DECLARE
    member_count    INT;
    allowed_members INT;
BEGIN
    SELECT COUNT(*) INTO member_count FROM FamilyMember WHERE policy_id = NEW.policy_id;
    SELECT ip.max_members INTO allowed_members
    FROM Policys p JOIN InsurancePlan ip ON p.plan_id = ip.plan_id
    WHERE p.policy_id = NEW.policy_id;

    IF member_count >= allowed_members THEN
        RAISE EXCEPTION 'Maximum family members exceeded for this plan';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_max_family
BEFORE INSERT ON FamilyMember
FOR EACH ROW EXECUTE FUNCTION validate_max_family_members();

-- Trigger 5: Relation rules per plan type
CREATE OR REPLACE FUNCTION validate_family_relation()
RETURNS TRIGGER AS $$
DECLARE
    plan INT;
BEGIN
    SELECT plan_id INTO plan FROM Policys WHERE policy_id = NEW.policy_id;
    IF plan = 1 THEN RAISE EXCEPTION 'Personal plan does not allow family members'; END IF;
    IF plan = 3 AND NEW.relation NOT IN ('Father', 'Mother') THEN
        RAISE EXCEPTION 'Parent plan allows only Father or Mother';
    END IF;
    IF plan = 2 AND NEW.relation IN ('Father', 'Mother') THEN
        RAISE EXCEPTION 'Family plan does not cover parents';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_family_relation
BEFORE INSERT ON FamilyMember
FOR EACH ROW EXECUTE FUNCTION validate_family_relation();

-- Trigger 6: Age validation (parents older, children younger than customer)
CREATE OR REPLACE FUNCTION validate_family_age()
RETURNS TRIGGER AS $$
DECLARE
    cust_age INT;
BEGIN
    SELECT c.age INTO cust_age FROM Customer c
    JOIN Policys p ON c.customer_id = p.customer_id
    WHERE p.policy_id = NEW.policy_id;

    IF NEW.relation IN ('Father', 'Mother') AND NEW.age <= cust_age THEN
        RAISE EXCEPTION 'Parent must be older than customer';
    END IF;
    IF NEW.relation IN ('Son', 'Daughter') AND NEW.age >= cust_age THEN
        RAISE EXCEPTION 'Child must be younger than customer';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_family_age
BEFORE INSERT ON FamilyMember
FOR EACH ROW EXECUTE FUNCTION validate_family_age();

-- Trigger 7: Prevent duplicate relations per policy
CREATE OR REPLACE FUNCTION prevent_duplicate_relation()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM FamilyMember
        WHERE policy_id = NEW.policy_id AND relation = NEW.relation
    ) THEN
        RAISE EXCEPTION 'Duplicate relation not allowed: %', NEW.relation;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_duplicate_relation
BEFORE INSERT ON FamilyMember
FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_relation();

-- =============================================================================
-- SYNC SEQUENCES (required after manual ID inserts)
-- PostgreSQL sequences must match highest existing ID to prevent conflicts
-- =============================================================================
SELECT setval(pg_get_serial_sequence('customer',     'customer_id'), MAX(customer_id))   FROM Customer;
SELECT setval(pg_get_serial_sequence('policys',      'policy_id'),   MAX(policy_id))      FROM Policys;
SELECT setval(pg_get_serial_sequence('claims',       'claim_id'),    MAX(claim_id))       FROM Claims;
SELECT setval(pg_get_serial_sequence('insuranceplan','plan_id'),     MAX(plan_id))        FROM InsurancePlan;
SELECT setval(pg_get_serial_sequence('familymember', 'member_id'),   MAX(member_id))      FROM FamilyMember;
SELECT setval(pg_get_serial_sequence('hospital',     'hospital_id'), MAX(hospital_id))    FROM Hospital;

-- =============================================================================
-- MIGRATION: PatientInterventions table (for Health Guardian Agent)
-- Run this AFTER the main schema if upgrading an existing database
-- =============================================================================
CREATE TABLE IF NOT EXISTS patientinterventions (
    intervention_id SERIAL PRIMARY KEY,
    customer_id     INT NOT NULL UNIQUE,  -- one active intervention per customer
    risk_score      NUMERIC(5,2) NOT NULL,
    risk_factors    JSONB NOT NULL DEFAULT '[]',
    care_plan       JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_intervention_customer
        FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interventions_customer ON patientinterventions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interventions_unread ON patientinterventions(is_read) WHERE is_read = FALSE;

-- Also add risk_score column to Customer for quick dashboard display
ALTER TABLE customer ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5,2) DEFAULT 0;

-- =============================================================================
-- VERIFY FINAL STATE
-- =============================================================================
SELECT 'Customers:'  AS table_name, COUNT(*) AS rows FROM Customer;
SELECT 'Plans:'      AS table_name, COUNT(*) AS rows FROM InsurancePlan;
SELECT 'Hospitals:'  AS table_name, COUNT(*) AS rows FROM Hospital;
SELECT 'Policies:'   AS table_name, COUNT(*) AS rows FROM Policys;
SELECT 'Claims:'     AS table_name, COUNT(*) AS rows FROM Claims;
SELECT 'Pending AI claims:' AS info, COUNT(*) AS count FROM Claims WHERE status = 'Pending';

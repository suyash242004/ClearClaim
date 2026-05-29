


	
CREATE DATABASE Medical_Insurance

-- DROP Table and again recreate it 
DROP Table Customer;
DROP Table InsurancePlan;
DROP Table Policys;
DROP Table Claims;
DROP Table FamilyMember;
DROP Table Hospital;
DROP Table PlanHospital;

-- one customer -> many policies
CREATE TABLE Customer (
    customer_id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(150) UNIQUE NOT NULL,
    customer_phone VARCHAR(15) NOT NULL,
    gender VARCHAR(10),
    age INT CHECK (age > 0 AND age <150),
    city VARCHAR(50),
    profession VARCHAR(50),
    blood_group VARCHAR(5),
    historical_disease TEXT
);



-- many policies -> one insuranceplan
-- numeric(10,2) means 10 digit before decimal point and 2 digit after it 
CREATE TABLE InsurancePlan (
    plan_id SERIAL PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL,
    premium_amount NUMERIC(10, 2) NOT NULL,
    coverage_amount NUMERIC(12, 2) NOT NULL,
    max_members INT NOT NULL CHECK (max_members > 0),
    policy_duration INT DEFAULT 1 CHECK (policy_duration > 0)
);

-- Customer → Policy (1 to many)
-- Policy → InsurancePlan (many to 1)
CREATE TABLE Policys (
    policy_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    plan_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    renewal_count INT DEFAULT 0,

    CONSTRAINT fk_policy_customer
        FOREIGN KEY (customer_id)
        REFERENCES Customer(customer_id)
        ON DELETE CASCADE,
        -- on delete cascade means if record in parent table is deleted all related records in child table is also delete
    CONSTRAINT fk_policy_plan
        FOREIGN KEY (plan_id)
        REFERENCES InsurancePlan(plan_id)
        ON DELETE RESTRICT
		-- on delete restrict record maens if record in parent table is deleted, delete operation is aborted if there are related records in child 
);
-- foreign key constraint

-- One policy → many family members
CREATE TABLE FamilyMember (
    member_id SERIAL PRIMARY KEY,
    policy_id INT NOT NULL,
    member_name VARCHAR(100) NOT NULL,
    relation VARCHAR(20) NOT NULL,
    age INT CHECK (age > 0 AND age<150),
    gender VARCHAR(10),

    CONSTRAINT fk_familymember_policy
        FOREIGN KEY (policy_id)
        REFERENCES Policys(policy_id)
        ON DELETE CASCADE
);

-- One policy → many claims
--  enum has static order set of values.. it is user defined datatype
CREATE TYPE claim_status AS ENUM ('Pending', 'Approved', 'Rejected');

CREATE TABLE Claims (
    claim_id SERIAL PRIMARY KEY,
    policy_id INT NOT NULL,
	hospital_id INT NOT NULL,
    claim_date DATE NOT NULL,
    claim_amount NUMERIC(10, 2) NOT NULL CHECK (claim_amount > 0),
    disease VARCHAR(100),
    status claim_status DEFAULT 'Pending',
    doctor_name VARCHAR(100),
    description TEXT,

    CONSTRAINT fk_claim_policy
        FOREIGN KEY (policy_id)
        REFERENCES Policys(policy_id)
        ON DELETE CASCADE,

	
    CONSTRAINT fk_claim_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES Hospital(hospital_id)
        ON DELETE RESTRICT

);


INSERT INTO InsurancePlan
(plan_id, plan_name, premium_amount, coverage_amount, max_members, policy_duration)
VALUES
(1, 'Personal Medical Insurance', 7000, 500000, 1, 1),
(2, 'Family Medical Insurance', 10000, 900000, 4, 1),
(3, 'Parent Medical Insurance', 12000, 1000000, 2, 1),
(4, 'Complete Family Medical Insurance', 7000, 1500000, 8, 1);

SELECT * FROM InsurancePlan;


INSERT INTO Customer
(customer_id, customer_name, customer_email, customer_phone, gender, age, city, profession, blood_group, historical_disease)
VALUES
(101, 'Suyash Matade', 'suy@gmail.com','900340394','Male', 21, 'Pune', 'Engineer', 'B+ve', 'No'),
(102, 'Amit Shekhare', 'amit@gmail.com','900340394','Male', 35, 'Mumbai', 'Doctor', 'A+ve', 'Diabetes'),
(103, 'Aditya Desai', 'aditya@gmail.com','900340394','Male', 29, 'Pune', 'Engineer', 'O+ve', 'No'),
(104, 'Harshal Pawar', 'harshal@gmail.com','900340394','Male', 40, 'Delhi', 'Teacher', 'AB+ve', 'No'),
(105, 'Neha Joshi', 'neha@gmail.com', '900340394','Female', 32, 'Pune', 'Doctor', 'B-ve', 'No');

SELECT * FROM Customer;

-- customer_id → FK to Customer
-- plan_id → FK to InsurancePlan
INSERT INTO Policys
(policy_id, customer_id, plan_id, start_date, end_date, is_active, renewal_count)
VALUES
(1001, 101, 2, '2026-04-07', '2027-04-07', TRUE, 0),
(1002, 102, 1, '2026-01-01', '2027-01-01', TRUE, 0),
(1003, 103, 3, '2026-02-01', '2027-02-01', TRUE, 0),
(1004, 104, 4, '2026-03-01', '2027-03-01', TRUE, 0),
(1005, 105, 2, '2026-05-01', '2027-05-01', TRUE, 0);

SELECT * FROM Policys;

INSERT INTO FamilyMember
(policy_id, member_name, relation, age, gender)
VALUES
-- Suyash (Family Plan - policy_id 1001)
(1001, 'Unknown Matade', 'Wife', 20, 'Female'),

-- Harshal (Complete Family Plan - policy_id 1004)
(1004, 'Sunita Pawar', 'Wife', 38, 'Female'),
(1004, 'Aryan Pawar', 'Son', 10, 'Male'),
(1004, 'Meena Pawar', 'Mother', 65, 'Female');

SELECT * FROM FamilyMember;


INSERT INTO Claims
(claim_id, policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES
-- Suyash – Family Plan – Apollo (Allowed)
(1, 1001, 1, '2026-05-01', 18000, 'Viral Fever', 'Approved', 'Dr. Sameer Naik', 'High fever and dehydration'),

-- Suyash – Family Plan – City Care (Allowed)
(2, 1001, 3, '2026-06-10', 45000, 'Minor Surgery', 'Rejected', 'Dr. Shantaram Zingate', 'Surgery not covered'),

-- Amit – Personal Plan – Apollo (Allowed)
(3, 1002, 1, '2026-03-15', 8000, 'Severe Cold', 'Approved', 'Dr. R. Monohar', 'Cold with breathing issue'),

-- Harshal – Complete Family – Max Hospital (Allowed)
(4, 1004, 4, '2026-07-10', 60000, 'Fracture Injury', 'Approved', 'Dr. A. Ambachore', 'Accidental fracture treatment');

SELECT * FROM Claims;

ALTER TABLE claims
ALTER COLUMN status TYPE VARCHAR(20)
USING status::text;

-- hospital table 
CREATE TABLE Hospital (
    hospital_id SERIAL PRIMARY KEY,
    hospital_name VARCHAR(150) NOT NULL,
    city VARCHAR(50) NOT NULL,
    is_cashless BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT uq_hospital UNIQUE (hospital_name, city)
);


-- Every many‑to‑many MUST have a junction table
-- InsurancePlan <----> Hospital


CREATE TABLE PlanHospital (
    plan_id INT NOT NULL,
    hospital_id INT NOT NULL,

    PRIMARY KEY (plan_id, hospital_id),

    CONSTRAINT fk_planhospital_plan
        FOREIGN KEY (plan_id)
        REFERENCES InsurancePlan(plan_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_planhospital_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES Hospital(hospital_id)
        ON DELETE CASCADE
);


INSERT INTO Hospital (hospital_name, city, is_cashless) VALUES
('Apollo Hospital', 'Pune', TRUE),        -- id = 1
('Ruby Hall Clinic', 'Pune', TRUE),       -- id = 2
('City Care Hospital', 'Mumbai', FALSE),  -- id = 3
('Max Hospital', 'Delhi', TRUE);          -- id = 4

SELECT * FROM Hospital;


-- Personal
INSERT INTO PlanHospital VALUES
(1, 1),
(1, 2);

-- Family
INSERT INTO PlanHospital VALUES
(2, 1),
(2, 2),
(2, 3);

-- Parent
INSERT INTO PlanHospital VALUES
(3, 2),
(3, 4);

-- Complete Family
INSERT INTO PlanHospital VALUES
(4, 1),
(4, 2),
(4, 3),
(4, 4);

SELECT * FROM PlanHospital;



-- Triggers : It guards DB. Validate data before insert/update. protect against invalid operations
-- Hard constraints that must never be violated


-- real insurance systems add business rules, validations, and lifecycle constraints that go beyond basic PK/FK/NOT NULL.

-- database constaints are alone not enough they can validate single row but cant easily validate cross-table, multi row logic 
-- ex : parent must be older than me and child must me younger than my age

--  CLAIMS

--  hospital allowed
--  coverage limit
--  policy active


--  FAMILY

--  max members
--  relation allowed
--  age validation
--  duplicate relation



-- 1.  Validate Hospital belongs to Plan
-- A claim can only be done at hospitals allowed by the policy’s plan

CREATE OR REPLACE FUNCTION validate_claim_hospital()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;



CREATE TRIGGER trg_validate_claim_hospital
BEFORE INSERT ON Claims
FOR EACH ROW
EXECUTE FUNCTION validate_claim_hospital();


-- 2. Validate Claim Amount ≤ Coverage

CREATE OR REPLACE FUNCTION validate_claim_amount()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_validate_claim_amount
BEFORE INSERT ON Claims
FOR EACH ROW
EXECUTE FUNCTION validate_claim_amount();


-- 3. Policy Must Be Active
-- Claim allowed only if policy is active and within date range

CREATE OR REPLACE FUNCTION validate_policy_active()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_policy_active
BEFORE INSERT ON Claims
FOR EACH ROW
EXECUTE FUNCTION validate_policy_active();




-- 4 Limit Max Family Members
-- Cannot exceed max_members defined in plan

CREATE OR REPLACE FUNCTION validate_max_family_members()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_validate_max_family
BEFORE INSERT ON FamilyMember
FOR EACH ROW
EXECUTE FUNCTION validate_max_family_members();



-- 5.  Relation Allowed Per Plan
-- Parent plan → only Father, Mother
-- Personal plan → no family allowed

CREATE OR REPLACE FUNCTION validate_family_relation()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_validate_family_relation
BEFORE INSERT ON familymember
FOR EACH ROW
EXECUTE FUNCTION validate_family_relation();


-- 6. Age Validation
-- Parents must be older than customer
-- Children must be younger than customer

CREATE OR REPLACE FUNCTION validate_family_age()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;



CREATE TRIGGER trg_validate_family_age
BEFORE INSERT ON familymember
FOR EACH ROW
EXECUTE FUNCTION validate_family_age();




-- 7. Prevent Duplicate Relations

-- Only one Wife
-- Only one Father, one Mother, etc.

CREATE OR REPLACE FUNCTION prevent_duplicate_relation()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_prevent_duplicate_relation
BEFORE INSERT ON familymember
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_relation();




-- dealing with CRUD operation ... read operation work fine ...for write is extra think different scenrios
-- if my hardcoded values start with 101, 102 -> if insert new data -> 1, 101, 102 its problematic is should be 103..
-- The issue is ONLY PostgreSQL sequences not synced with manually inserted IDs.


-- Sync PostgreSQL auto-increment sequence with highest existing ID in table
-- After syncing, PostgreSQL automatically generates next IDs during inserts.
-- MAX(customer_id) gets the highest existing ID from the table.
-- setval() updates PostgreSQL sequence so next insert continues from that ID.

SELECT setval(
    pg_get_serial_sequence('customer', 'customer_id'),
    MAX(customer_id)
)
FROM customer;

SELECT setval(
    pg_get_serial_sequence('policys', 'policy_id'),
    MAX(policy_id)
)
FROM policys;

SELECT setval(
    pg_get_serial_sequence('claims', 'claim_id'),
    MAX(claim_id)
)
FROM claims;

SELECT setval(
    pg_get_serial_sequence('insuranceplan', 'plan_id'),
    MAX(plan_id)
)
FROM insuranceplan;

SELECT setval(
    pg_get_serial_sequence('familymember', 'member_id'),
    MAX(member_id)
)
FROM familymember;

SELECT setval(
    pg_get_serial_sequence('hospital', 'hospital_id'),
    MAX(hospital_id)
)
FROM hospital;

-- In Real database : 
-- Initial IDs: 1,2,3,4,5 -> delete(3) -> 1,2,4,5 -> nextinsertid(6)
-- ID 3 is normally gone forever.
-- PostgreSQL SERIAL/IDENTITY generates unique IDs automatically.
-- Deleted IDs are not reused; sequence always moves forward.

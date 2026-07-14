-- =============================================================================
-- ClearClaim AI — Migration Script
-- Run this ONCE on your existing Medical_Insurance database
-- Safe: uses ADD COLUMN IF NOT EXISTS — will NOT break existing data
-- =============================================================================

-- =============================================================================
-- STEP 1: Add password to Customer table
-- =============================================================================

ALTER TABLE Customer
ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'password123';

-- Set default password for all existing customers
UPDATE Customer SET password = 'password123' WHERE password IS NULL;

-- =============================================================================
-- STEP 2: Add AI columns to Claims table
-- These store the output from the AI claim processor agent
-- =============================================================================

ALTER TABLE Claims
ADD COLUMN IF NOT EXISTS ai_decision VARCHAR(20);
-- 'Approve', 'Reject', 'Flag' — what the AI decided

ALTER TABLE Claims
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
-- Full text explanation from Claude/Gemini

ALTER TABLE Claims
ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5, 2);
-- 0.00 to 1.00 — how confident the AI was

ALTER TABLE Claims
ADD COLUMN IF NOT EXISTS fraud_score INT;
-- 0-100 fraud risk score (0 = clean, 100 = highly suspicious)

ALTER TABLE Claims
ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(100);
-- Blockchain transaction hash from X Layer after AI decision

-- =============================================================================
-- STEP 3: Insert rich demo data — PENDING claims for AI to process
-- These are designed with various AI scenarios:
--   - Disease mismatch (fraud signal)
--   - New policy + big claim (fraud signal)
--   - Legitimate claims (should approve)
--   - High-value claim near coverage limit
-- =============================================================================

-- Scenario A: SUSPICIOUS — Amit (historical: Diabetes) claiming Cardiac Surgery
-- AI should REJECT or FLAG this — clear disease mismatch
INSERT INTO Claims (policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1002, 1, CURRENT_DATE, 95000, 'Cardiac Surgery', 'Pending', 'Dr. Rajesh Mehta',
        'Bypass surgery for blocked arteries. Emergency admission.');

-- Scenario B: SUSPICIOUS — Neha, big claim within 45 days of policy start
-- Policy started 2026-05-01. Claim today ~Day 68 — moderate risk. Amount is 70% of coverage.
INSERT INTO Claims (policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1005, 3, CURRENT_DATE, 630000, 'Kidney Transplant', 'Pending', 'Dr. Amit Kulkarni',
        'Kidney failure requiring transplant. Patient admitted emergency ward.');

-- Scenario C: LEGITIMATE — Suyash, minor illness, low amount, matching history
-- Historical: 'No' disease, claiming 'Viral Fever' — consistent. Low amount.
INSERT INTO Claims (policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1001, 2, CURRENT_DATE, 12000, 'Viral Fever', 'Pending', 'Dr. Priya Sharma',
        'High fever with body ache. IV fluids and 2 day hospitalization.');

-- Scenario D: LEGITIMATE — Harshal, fracture, reasonable amount, valid hospital
-- No historical disease, claiming fracture — legitimate. Complete Family plan has max coverage.
INSERT INTO Claims (policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1004, 4, CURRENT_DATE, 38000, 'Bone Fracture', 'Pending', 'Dr. Suresh Patil',
        'Right arm fracture due to fall. Plaster cast and physiotherapy required.');

-- Scenario E: SUSPICIOUS — Aditya, claiming for disease not in history, high amount
-- Historical: 'No' disease, but claiming for 'Cancer Treatment' — very suspicious
-- Parent Plan (plan 3) covers Ruby Hall and Max Hospital — valid hospital
INSERT INTO Claims (policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1003, 4, CURRENT_DATE, 480000, 'Cancer Treatment', 'Pending', 'Dr. Anil Joshi',
        'Chemotherapy sessions for Stage 2 lung cancer. 3 month treatment plan.');

-- Scenario F: EDGE CASE — Suyash, second claim, cumulative amount approaching coverage
-- First approved claim was 18000. This one is 45000. Total = 63000. Coverage = 900000. Fine.
-- But disease is valid. Should APPROVE.
INSERT INTO Claims (policy_id, hospital_id, claim_date, claim_amount, disease, status, doctor_name, description)
VALUES (1001, 1, CURRENT_DATE, 45000, 'Appendicitis Surgery', 'Pending', 'Dr. Kavya Nair',
        'Acute appendicitis requiring emergency laparoscopic surgery. 3 days hospitalization.');

-- =============================================================================
-- STEP 4: Verify
-- =============================================================================

SELECT 'Customer table columns:' AS info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'customer' ORDER BY ordinal_position;

SELECT 'Claims table columns:' AS info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'claims' ORDER BY ordinal_position;

SELECT 'Pending claims count:' AS info;
SELECT COUNT(*) AS pending_count FROM Claims WHERE status = 'Pending';

SELECT 'All pending claims:' AS info;
SELECT claim_id, policy_id, disease, claim_amount, status FROM Claims WHERE status = 'Pending' ORDER BY claim_id;

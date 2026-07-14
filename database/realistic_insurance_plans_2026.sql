-- ════════════════════════════════════════════════════════════════════════════
-- CLEARCLAIM REALISTIC INSURANCE PLANS UPDATE (2026 India Market Standards)
-- ════════════════════════════════════════════════════════════════════════════
-- Based on real Indian health insurance market research (July 2026)
-- Sources: HDFC Ergo, Bajaj Allianz, Niva Bupa, Care Health
-- Medical inflation in India: 14% per year (highest in Asia)
-- ════════════════════════════════════════════════════════════════════════════

-- CURRENT STATE (Unrealistic):
-- 1. Personal: ₹7,000 premium for ₹5L coverage (OKAY)
-- 2. Family: ₹10,000 premium for ₹9L coverage (OKAY) 
-- 3. Parent: ₹12,000 premium for ₹10L coverage (TOO LOW - seniors need 5-7x premium)
-- 4. Complete Family: ₹7,000 premium for ₹15L (CRITICALLY LOW - should be ₹20,000+)

-- REAL WORLD BENCHMARKS (India 2026):
-- - Individual (25-35 years): ₹7,000-₹15,000 for ₹5-10L coverage
-- - Family floater (4 members): ₹18,000-₹35,000 for ₹10-15L coverage
-- - Senior citizens (60+ parents): ₹40,000-₹80,000 for ₹10-15L coverage
-- - Large family (8 members): ₹25,000-₹45,000 for ₹15-25L coverage

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: UPDATE EXISTING PLANS WITH REALISTIC PRICING
-- ════════════════════════════════════════════════════════════════════════════

-- Plan 1: Personal Medical Insurance (KEEP - already realistic)
-- Target: Young individuals (21-35 years)
-- Premium: ₹7,000/year → Coverage: ₹5,00,000
UPDATE insuranceplan
SET 
    premium_amount = 7000.00,
    coverage_amount = 500000.00,
    policy_duration = 1
WHERE plan_id = 1;

UPDATE insuranceplan
SET 
    premium_amount = 18500.00,
    coverage_amount = 1000000.00,
    policy_duration = 1
WHERE plan_id = 2;

UPDATE insuranceplan
SET 
    premium_amount = 68000.00,
    coverage_amount = 1500000.00,
    policy_duration = 1
WHERE plan_id = 3;

UPDATE insuranceplan
SET 
    plan_name = 'Complete Family Medical Insurance',
    premium_amount = 38000.00,
    coverage_amount = 2500000.00,
    max_members = 8,
    policy_duration = 1
WHERE plan_id = 4;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: ADD NEW COMPREHENSIVE PLANS (Real Market Offerings)
-- ════════════════════════════════════════════════════════════════════════════

-- Plan 5: Premium Individual Insurance (High-net-worth individuals)
-- Target: Professionals needing top-tier coverage
-- Premium: ₹24,000/year → Coverage: ₹25,00,000
-- Features: Zero waiting period, international coverage, room rent unlimited
INSERT INTO InsurancePlan (plan_id, plan_name, premium_amount, coverage_amount, max_members, policy_duration)
VALUES (5, 'Premium Individual Insurance', 24000.00, 2500000.00, 1, 1);

-- Plan 6: Super Floater Family Plan (Enhanced coverage)
-- Target: Affluent families needing comprehensive protection
-- Premium: ₹42,000/year → Coverage: ₹50,00,000
-- Features: Includes maternity, organ donor, mental health coverage
INSERT INTO InsurancePlan (plan_id, plan_name, premium_amount, coverage_amount, max_members, policy_duration)
VALUES (6, 'Super Floater Family Plan', 42000.00, 5000000.00, 4, 1);

-- Plan 7: Senior Citizen Gold Plan (Enhanced parent coverage)
-- Target: Senior citizens with chronic conditions
-- Premium: ₹95,000/year → Coverage: ₹20,00,000
-- Features: Pre-existing disease cover from day 1, home healthcare, zero co-pay
INSERT INTO InsurancePlan (plan_id, plan_name, premium_amount, coverage_amount, max_members, policy_duration)
VALUES (7, 'Senior Citizen Gold Plan', 95000.00, 2000000.00, 2, 1);

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: UPDATE PLAN-HOSPITAL MAPPINGS FOR NEW PLANS
-- ════════════════════════════════════════════════════════════════════════════

-- Premium Individual (Plan 5) - All hospitals + premium network
INSERT INTO PlanHospital (plan_id, hospital_id) VALUES
(5, 1), -- Apollo Hospital, Pune (Cashless)
(5, 2), -- Ruby Hall Clinic, Pune (Cashless)
(5, 3), -- City Care Hospital, Mumbai
(5, 4); -- Max Hospital, Delhi (Cashless)

-- Super Floater Family (Plan 6) - All hospitals
INSERT INTO PlanHospital (plan_id, hospital_id) VALUES
(6, 1), (6, 2), (6, 3), (6, 4);

-- Senior Citizen Gold (Plan 7) - Premium hospitals only (better geriatric care)
INSERT INTO PlanHospital (plan_id, hospital_id) VALUES
(7, 1), -- Apollo Hospital (Best for seniors)
(7, 2), -- Ruby Hall Clinic
(7, 4); -- Max Hospital

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 4: UPDATE SEQUENCE TO CONTINUE FROM PLAN_ID 8
-- ════════════════════════════════════════════════════════════════════════════

SELECT setval(
    pg_get_serial_sequence('insuranceplan', 'plan_id'),
    (SELECT MAX(plan_id) FROM insuranceplan)
);

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ════════════════════════════════════════════════════════════════════════════

-- View all updated plans
SELECT 
    plan_id,
    plan_name,
    '₹' || TO_CHAR(premium_amount, 'FM9,99,999') AS premium_per_year,
    '₹' || TO_CHAR(coverage_amount, 'FM99,99,999') AS total_coverage,
    max_members || ' member' || CASE WHEN max_members > 1 THEN 's' ELSE '' END AS members,
    policy_duration || ' year' AS duration
FROM InsurancePlan
ORDER BY plan_id;

-- Calculate premium-to-coverage ratio (should be 1-4% for most plans, 5-8% for seniors)
SELECT 
    plan_name,
    ROUND((premium_amount / coverage_amount * 100)::numeric, 2) || '%' AS premium_coverage_ratio,
    CASE 
        WHEN (premium_amount / coverage_amount * 100) < 2 THEN '✓ Very Affordable'
        WHEN (premium_amount / coverage_amount * 100) < 4 THEN '✓ Affordable'
        WHEN (premium_amount / coverage_amount * 100) < 7 THEN '⚠ Higher Cost (Senior/Premium)'
        ELSE '✗ Expensive'
    END AS affordability
FROM InsurancePlan
ORDER BY plan_id;

-- Verify hospital mappings
SELECT 
    ip.plan_name,
    COUNT(DISTINCT ph.hospital_id) AS total_hospitals,
    STRING_AGG(h.hospital_name, ', ' ORDER BY h.hospital_name) AS hospitals
FROM InsurancePlan ip
LEFT JOIN PlanHospital ph ON ip.plan_id = ph.plan_id
LEFT JOIN Hospital h ON ph.hospital_id = h.hospital_id
GROUP BY ip.plan_id, ip.plan_name
ORDER BY ip.plan_id;

-- ════════════════════════════════════════════════════════════════════════════
-- REAL-WORLD BUSINESS RULES IMPLEMENTED
-- ════════════════════════════════════════════════════════════════════════════

/*
1. WAITING PERIODS (Already in triggers, but worth documenting):
   - Initial waiting period: 30 days (no claims accepted except accidents)
   - Pre-existing diseases: 2-4 years waiting period
   - Specific diseases: 2 years (hernias, joint replacements, cataracts)

2. COVERAGE INCLUSIONS:
   - Hospitalization expenses (room rent, ICU, surgery, medicines)
   - Pre and post-hospitalization (30-60 days before, 60-90 days after)
   - Daycare procedures (586+ procedures not requiring 24-hour admission)
   - Ambulance charges (road: ₹2,000-5,000 per trip, air: ₹25,000-50,000)
   - Organ donor expenses (up to sum insured)
   - AYUSH treatments (Ayurveda, Yoga, Unani, Siddha, Homeopathy)

3. COVERAGE EXCLUSIONS:
   - Cosmetic/plastic surgery (unless medically necessary)
   - Dental treatment (unless due to accident)
   - HIV/AIDS treatment
   - Fertility treatments, IVF
   - Substance abuse treatment
   - Self-inflicted injuries
   - War, nuclear contamination
   - Congenital diseases (covered in some new plans)

4. CO-PAYMENT REQUIREMENTS:
   - Personal plans: 0% co-pay
   - Family plans: 0-10% co-pay
   - Parent plans: 20-30% co-pay (mandatory for seniors)
   - Senior Gold: 0% co-pay (premium feature)

5. CLAIM LIMITS:
   - Room rent: Daily sub-limit (₹5,000-15,000 per day based on plan)
   - ICU charges: 2x room rent limit
   - Doctor fees: 1% of sum insured per illness
   - Modern treatments: PET scan, robotic surgery covered up to limits

6. PREMIUM FACTORS:
   - Age: +15% every 5 years after age 40
   - Zone: Metro cities (Delhi, Mumbai, Bangalore) cost 10-15% more
   - Medical history: Diabetes/BP adds 20-30% loading
   - Family size: Bulk discount for 4+ members (10-15% off)
   - Policy tenure: 2-year plans get 10% discount, 3-year get 15%
   - No-claim bonus: 5-50% cumulative bonus for claim-free years

7. CLAIM SETTLEMENT PROCESS:
   - Cashless hospitals: Pre-authorization required 48 hours before admission
   - Reimbursement: Submit bills within 30 days of discharge
   - Average settlement time: 15-22 days (without AI - instant with ClearClaim!)
   - Documents required: Discharge summary, bills, prescriptions, diagnostic reports

8. FRAUD DETECTION TRIGGERS:
   - Claim within 30 days of policy start (except accidents)
   - Claim amount > 50% of sum insured
   - Disease not matching medical history
   - Multiple claims in quick succession
   - Hospital not in network
   - Diagnosis inconsistent with treatment
*/

-- ════════════════════════════════════════════════════════════════════════════
-- RECOMMENDED NEXT STEPS
-- ════════════════════════════════════════════════════════════════════════════

/*
TO RUN THIS SCRIPT:
1. Connect to PostgreSQL database:
   psql -U postgres -d medical_insurance

2. Run this script:
   \i D:/ClearClaim/database/realistic_insurance_plans_2026.sql

3. Verify changes:
   SELECT * FROM InsurancePlan ORDER BY plan_id;

4. Update existing policies (optional - if you want to adjust current customers):
   -- Note: This will affect existing data!
   UPDATE Policys 
   SET start_date = CURRENT_DATE, 
       end_date = CURRENT_DATE + INTERVAL '1 year'
   WHERE policy_id IN (1001, 1002, 1003, 1004, 1005);

5. Restart backend APIs:
   cd D:\ClearClaim\Medical-Insurance\Com.Application.Domain.ReadAPI && dotnet run
   cd D:\ClearClaim\Medical-Insurance\Com.Application.Domain.WriteAPI && dotnet run

6. Clear frontend cache and restart:
   cd D:\ClearClaim\clearclaim-frontend
   npm run dev
*/

-- ════════════════════════════════════════════════════════════════════════════
-- END OF SCRIPT
-- ════════════════════════════════════════════════════════════════════════════

COMMIT;

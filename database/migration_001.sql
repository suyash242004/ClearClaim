-- =============================================================================
-- migration_001.sql — Run in pgAdmin on medical_insurance database
-- Safe to re-run: uses IF NOT EXISTS / IF NOT EXISTS everywhere
-- =============================================================================

-- 1. risk_score column on Customer
ALTER TABLE customer ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5,2) DEFAULT 0;

-- 2. wallet_address for Health Passport / SBT linking
ALTER TABLE customer ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42);
CREATE INDEX IF NOT EXISTS idx_customer_wallet ON customer(wallet_address) WHERE wallet_address IS NOT NULL;

-- 3. PatientInterventions table (Health Guardian Agent 6)
CREATE TABLE IF NOT EXISTS patientinterventions (
    intervention_id SERIAL PRIMARY KEY,
    customer_id     INT NOT NULL UNIQUE,
    risk_score      NUMERIC(5,2) NOT NULL,
    risk_factors    JSONB NOT NULL DEFAULT '[]',
    care_plan       JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_intervention_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer(customer_id)
        ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_interventions_customer ON patientinterventions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interventions_unread  ON patientinterventions(is_read) WHERE is_read = FALSE;

-- 4. AI columns on Claims (for agent decisions + blockchain proof)
ALTER TABLE claims ADD COLUMN IF NOT EXISTS ai_decision    TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS ai_reasoning   TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS ai_confidence  NUMERIC(5,2);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS fraud_score    INT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS tx_hash        VARCHAR(100);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS doctor_name    VARCHAR(150);

-- 5. Verify everything worked
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Customer'
  AND column_name IN ('risk_score', 'wallet_address')
ORDER BY column_name;

SELECT table_name
FROM information_schema.tables
WHERE table_name = 'PatientInterventions';

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'Claims'
  AND column_name IN ('ai_decision', 'fraud_score', 'tx_hash', 'doctor_name')
ORDER BY column_name;

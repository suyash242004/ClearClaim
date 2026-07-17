"""
agents/shared/db.py — Single source of truth for all PostgreSQL access.

TABLE NAMING (CRITICAL — read before editing):
The schema was created with UNQUOTED identifiers:  CREATE TABLE Customer (...)
PostgreSQL folds unquoted identifiers to LOWERCASE. So the real table names are:
    customer, insuranceplan, hospital, policys, planhospital,
    familymember, claims, patientinterventions

Therefore every query below uses LOWERCASE, UNQUOTED table names.
Do NOT wrap them in double quotes — "Customer" would look for a
different, non-existent table and raise: relation "Customer" does not exist.
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD


def get_db_connection():
    """Returns a new connection to the PostgreSQL database.
    connect_timeout bounds an unreachable DB at 8s instead of the OS TCP
    timeout (~2 min), which would blow the x402 response window."""
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD,
        connect_timeout=8,
    )


# ────────────────────────────────────────────────────────────────────────────
# Customer
# ────────────────────────────────────────────────────────────────────────────
def get_customer_history(customer_id: int):
    """Fetches full customer details including historical diseases."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM customer WHERE customer_id = %s", (customer_id,))
            row = cur.fetchone()
            return dict(row) if row else {}
    finally:
        conn.close()


def save_customer_wallet(customer_id: int, wallet_address: str):
    """Links a wallet address to a customer for the Health Passport SBT."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE customer SET wallet_address = %s WHERE customer_id = %s",
                (wallet_address, customer_id)
            )
        conn.commit()
    finally:
        conn.close()


def get_customer_wallet(customer_id: int):
    """Retrieves the customer's linked wallet address (or None)."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT wallet_address FROM customer WHERE customer_id = %s",
                (customer_id,)
            )
            row = cur.fetchone()
            return row[0] if row else None
    finally:
        conn.close()


# ────────────────────────────────────────────────────────────────────────────
# Policy
# ────────────────────────────────────────────────────────────────────────────
def get_policy_details(policy_id: int):
    """Policy + linked plan's coverage amount and name."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT p.*, ip.coverage_amount, ip.plan_name
                FROM policys p
                JOIN insuranceplan ip ON p.plan_id = ip.plan_id
                WHERE p.policy_id = %s
            """, (policy_id,))
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def get_customer_policies(customer_id: int):
    """All policies owned by a customer, including plan details."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT p.*, ip.plan_name, ip.coverage_amount, ip.premium_amount
                FROM policys p
                JOIN insuranceplan ip ON p.plan_id = ip.plan_id
                WHERE p.customer_id = %s
            """, (customer_id,))
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def get_active_policies_with_customers():
    """Active policies joined with customer profiles — used by Predictive Risk Agent."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT p.policy_id, p.customer_id, p.plan_id, p.start_date, p.end_date,
                       c.customer_name, c.age, c.gender, c.historical_disease,
                       c.city, ip.plan_name, ip.coverage_amount
                FROM policys p
                JOIN customer c      ON p.customer_id = c.customer_id
                JOIN insuranceplan ip ON p.plan_id     = ip.plan_id
                WHERE p.is_active = TRUE
            """)
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


# ────────────────────────────────────────────────────────────────────────────
# Hospital
# ────────────────────────────────────────────────────────────────────────────
def check_hospital_validity(policy_id: int, hospital_id: int):
    """True if the hospital is in the network of this policy's plan."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM policys p
                JOIN planhospital ph ON p.plan_id = ph.plan_id
                WHERE p.policy_id = %s AND ph.hospital_id = %s
            """, (policy_id, hospital_id))
            return cur.fetchone() is not None
    finally:
        conn.close()


# ────────────────────────────────────────────────────────────────────────────
# Claims
# ────────────────────────────────────────────────────────────────────────────
def get_claim_details(claim_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM claims WHERE claim_id = %s", (claim_id,))
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def get_customer_claims(customer_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT c.*
                FROM claims c
                JOIN policys p ON c.policy_id = p.policy_id
                WHERE p.customer_id = %s
                ORDER BY c.claim_date DESC
            """, (customer_id,))
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def get_previous_claims_total(policy_id: int):
    """Total APPROVED claim amount on a policy — used to compute remaining coverage."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COALESCE(SUM(claim_amount), 0) FROM claims "
                "WHERE policy_id = %s AND status = %s",
                (policy_id, 'Approved')
            )
            return float(cur.fetchone()[0])
    finally:
        conn.close()


def get_claim_count_for_policy(policy_id: int, exclude_claim_id: int = None):
    """Number of prior claims on this policy — fraud-frequency signal."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if exclude_claim_id is not None:
                cur.execute(
                    "SELECT COUNT(*) FROM claims WHERE policy_id = %s AND claim_id != %s",
                    (policy_id, exclude_claim_id)
                )
            else:
                cur.execute("SELECT COUNT(*) FROM claims WHERE policy_id = %s", (policy_id,))
            return int(cur.fetchone()[0])
    finally:
        conn.close()


def get_customer_recent_claims(customer_id: int, months: int = 12):
    """Claims filed by a customer in the last N months."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT c.claim_id, c.claim_amount, c.disease, c.status, c.claim_date
                FROM claims c
                JOIN policys p ON c.policy_id = p.policy_id
                WHERE p.customer_id = %s
                  AND c.claim_date >= (CURRENT_DATE - (%s * INTERVAL '1 month'))
                ORDER BY c.claim_date DESC
            """, (customer_id, months))
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def submit_claim_draft(policy_id: int, hospital_id: int, claim_amount: float,
                       disease: str, doctor_name: str, description: str):
    """Inserts a Pending claim (used by the Chat Agent's submit_claim tool)."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO claims (policy_id, hospital_id, claim_date, claim_amount,
                                    disease, status, doctor_name, description)
                VALUES (%s, %s, CURRENT_DATE, %s, %s, 'Pending', %s, %s)
                RETURNING claim_id
            """, (policy_id, hospital_id, claim_amount, disease, doctor_name, description))
            row = cur.fetchone()
            conn.commit()
            return row['claim_id'] if row else None
    finally:
        conn.close()


def write_ai_decision(claim_id: int, decision: str, reasoning: str,
                      confidence: float, tx_hash: str = None):
    """Persists an AI agent's decision back onto the claim row."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE claims
                   SET ai_decision   = %s,
                       ai_reasoning  = %s,
                       ai_confidence = %s,
                       tx_hash       = COALESCE(%s, tx_hash)
                 WHERE claim_id = %s
            """, (decision, reasoning, confidence, tx_hash, claim_id))
        conn.commit()
    finally:
        conn.close()


def write_fraud_score(claim_id: int, score: int):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE claims SET fraud_score = %s WHERE claim_id = %s",
                (score, claim_id)
            )
        conn.commit()
    finally:
        conn.close()


# ────────────────────────────────────────────────────────────────────────────
# Patient Interventions (Health Guardian)
# ────────────────────────────────────────────────────────────────────────────
def store_patient_intervention(customer_id: int, risk_score: float,
                               risk_factors: list, care_plan: dict):
    """Upserts a Health Guardian care plan for a customer."""
    import json as _json
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO patientinterventions
                    (customer_id, risk_score, risk_factors, care_plan, created_at, is_read)
                VALUES (%s, %s, %s, %s, NOW(), FALSE)
                ON CONFLICT (customer_id)
                DO UPDATE SET
                    risk_score   = EXCLUDED.risk_score,
                    risk_factors = EXCLUDED.risk_factors,
                    care_plan    = EXCLUDED.care_plan,
                    created_at   = NOW(),
                    is_read      = FALSE
            """, (customer_id, risk_score,
                  _json.dumps(risk_factors), _json.dumps(care_plan)))
        conn.commit()
    finally:
        conn.close()


def get_patient_intervention(customer_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM patientinterventions WHERE customer_id = %s "
                "ORDER BY created_at DESC LIMIT 1",
                (customer_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def save_risk_score(customer_id: int, risk_score: float):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE customer SET risk_score = %s WHERE customer_id = %s",
                (round(risk_score, 4), customer_id)
            )
        conn.commit()
    finally:
        conn.close()


# ────────────────────────────────────────────────────────────────────────────
# Agent Learning Log (RLHF)
# ────────────────────────────────────────────────────────────────────────────
def ensure_learning_table():
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS agentlearninglog (
                    log_id         SERIAL PRIMARY KEY,
                    agent_name     VARCHAR(50) NOT NULL,
                    claim_id       INT,
                    ai_decision    VARCHAR(20),
                    human_decision VARCHAR(20),
                    notes          TEXT,
                    logged_at      TIMESTAMPTZ DEFAULT NOW()
                )
            """)
        conn.commit()
    finally:
        conn.close()


def get_human_overrides(limit: int = 20):
    """Claims where a human admin reversed the AI's decision — the RLHF training signal."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT claim_id, disease, claim_amount, ai_decision, ai_reasoning, status
                FROM claims
                WHERE ai_decision IS NOT NULL
                  AND status IN ('Approved', 'Rejected')
                  AND (
                        (ai_decision = 'Reject'  AND status = 'Approved') OR
                        (ai_decision = 'Approve' AND status = 'Rejected')
                      )
                ORDER BY claim_id DESC
                LIMIT %s
            """, (limit,))
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

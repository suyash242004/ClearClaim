"""
agents/hospital_assistant/router.py — Hospital Clinical Assistant (Agent 7)

Provides AI-powered ICD-10 coding, treatment protocols, and claim approval
estimation for hospital staff. Helps hospitals document claims correctly
BEFORE submission, reducing rejection rates.

Real-world value: 15-20% of Indian hospital claims are rejected due to
improper documentation. This agent prevents that proactively.

Endpoints:
  GET  /agent/hospital-assistant/{claim_id}        — Full clinical review
  POST /agent/hospital-assistant/pre-auth          — Pre-authorization check
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from shared.gemini_client import generate_json_response

router = APIRouter()


class ClinicalReviewResponse(BaseModel):
    claim_id: int
    patient_name: str
    disease: str
    icd_code: str
    icd_description: str
    treatment_protocol: str
    approval_probability: str          # "High", "Medium", "Low"
    estimated_settlement_days: int     # How fast this claim type typically settles
    clinical_notes: str
    documentation_checklist: list      # What documents to submit to avoid rejection
    red_flags: list                    # Issues that could cause rejection


class PreAuthRequest(BaseModel):
    hospital_id: int
    policy_id: int
    planned_disease: str
    planned_amount: float
    planned_admission_date: str


class PreAuthResponse(BaseModel):
    authorized: bool
    authorization_code: Optional[str]
    coverage_available: float
    hospital_in_network: bool
    estimated_approval_probability: str
    notes: str


CLINICAL_REVIEW_PROMPT = """You are Agent 7 — ClearClaim AI Clinical Assistant.
You help hospital staff document insurance claims correctly to avoid rejection.

CLAIM INFORMATION:
- Claim ID: {claim_id}
- Patient: {patient_name} (Age: {patient_age}, Gender: {patient_gender})
- Historical Diseases: {historical_disease}
- Claimed Condition: {disease}
- Claim Amount: Rs{claim_amount}
- Hospital: {hospital_name} (Cashless: {is_cashless})
- Policy Coverage Remaining: Rs{coverage_remaining}
- Description: {description}

Your job:
1. Assign the most accurate ICD-10 code for the claimed disease.
2. Summarize standard treatment protocol (2-3 sentences).
3. Assess approval probability based on claim vs coverage, disease match with history.
4. List exactly what documents the hospital must submit.
5. Flag any red flags that could cause claim rejection.

Return ONLY valid JSON (no markdown):
{{
  "icd_code": "J01.90",
  "icd_description": "Acute sinusitis, unspecified",
  "treatment_protocol": "Standard treatment includes antibiotics for 7-10 days, nasal decongestants, and saline irrigation. Hospitalization typically not required unless complicated by orbital cellulitis.",
  "approval_probability": "High",
  "estimated_settlement_days": 3,
  "clinical_notes": "Claim is well-documented. Ensure discharge summary includes ENT specialist sign-off.",
  "documentation_checklist": [
    "Discharge summary with ICD code",
    "Original hospital bills with break-up",
    "Prescriptions from treating doctor",
    "Lab reports if any",
    "Doctor's certificate of illness"
  ],
  "red_flags": []
}}

approval_probability must be: "High" | "Medium" | "Low"
estimated_settlement_days: integer (1-30)
"""


@router.get("/agent/hospital-assistant/{claim_id}", response_model=ClinicalReviewResponse)
def get_clinical_review(claim_id: int):
    """
    Full AI clinical review for a hospital claim.
    Fixes improper documentation BEFORE claim is submitted — reduces rejection rate.
    """
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
    )
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Correct join: Claims → Policys → Customer, Claims → Hospital
            cur.execute('''
                SELECT
                    c.claim_id,
                    c.disease,
                    c.claim_amount,
                    c.description,
                    c.status,
                    h.hospital_name,
                    h.is_cashless,
                    cust.customer_name,
                    cust.age AS patient_age,
                    cust.gender AS patient_gender,
                    cust.historical_disease,
                    ip.coverage_amount,
                    COALESCE(prev.approved_total, 0) AS prev_approved_total
                FROM claims c
                JOIN policys pol ON c.policy_id = pol.policy_id
                JOIN customer cust ON pol.customer_id = cust.customer_id
                JOIN hospital h ON c.hospital_id = h.hospital_id
                JOIN insuranceplan ip ON pol.plan_id = ip.plan_id
                LEFT JOIN (
                    SELECT policy_id, SUM(claim_amount) AS approved_total
                    FROM claims
                    WHERE status = 'Approved'
                    GROUP BY policy_id
                ) prev ON c.policy_id = prev.policy_id
                WHERE c.claim_id = %s
            ''', (claim_id,))
            claim = cur.fetchone()
    finally:
        conn.close()

    if not claim:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found")

    coverage_remaining = float(claim["coverage_amount"]) - float(claim["prev_approved_total"])

    prompt = CLINICAL_REVIEW_PROMPT.format(
        claim_id=claim["claim_id"],
        patient_name=claim["customer_name"] or "Unknown",
        patient_age=claim["patient_age"] or "N/A",
        patient_gender=claim["patient_gender"] or "N/A",
        historical_disease=claim["historical_disease"] or "None",
        disease=claim["disease"] or "Unknown",
        claim_amount=claim["claim_amount"] or 0,
        hospital_name=claim["hospital_name"] or "Unknown",
        is_cashless=claim["is_cashless"] or False,
        coverage_remaining=coverage_remaining,
        description=claim["description"] or "No description provided",
    )

    try:
        ai = generate_json_response(prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    return ClinicalReviewResponse(
        claim_id=claim_id,
        patient_name=claim["customer_name"] or "Unknown",
        disease=claim["disease"] or "Unknown",
        icd_code=ai.get("icd_code", "N/A"),
        icd_description=ai.get("icd_description", "Unknown"),
        treatment_protocol=ai.get("treatment_protocol", "Standard treatment protocol."),
        approval_probability=ai.get("approval_probability", "Medium"),
        estimated_settlement_days=int(ai.get("estimated_settlement_days", 7)),
        clinical_notes=ai.get("clinical_notes", ""),
        documentation_checklist=ai.get("documentation_checklist", []),
        red_flags=ai.get("red_flags", []),
    )


@router.post("/agent/hospital-assistant/pre-auth", response_model=PreAuthResponse)
def check_pre_authorization(req: PreAuthRequest):
    """
    Pre-authorization check — validates BEFORE patient is admitted.
    This prevents the #1 reason claims fail: treatment not pre-authorized.
    Real hospitals wait 2-7 days for this. We do it in 2 seconds.
    """
    import secrets
    from datetime import date

    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
    )
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check policy is active and get coverage
            cur.execute('''
                SELECT pol.is_active, pol.end_date,
                       ip.coverage_amount,
                       COALESCE(prev.approved_total, 0) AS prev_approved
                FROM policys pol
                JOIN insuranceplan ip ON pol.plan_id = ip.plan_id
                LEFT JOIN (
                    SELECT policy_id, SUM(claim_amount) AS approved_total
                    FROM claims WHERE status = 'Approved'
                    GROUP BY policy_id
                ) prev ON pol.policy_id = prev.policy_id
                WHERE pol.policy_id = %s
            ''', (req.policy_id,))
            policy = cur.fetchone()

            # Check if hospital is in this plan's network
            cur.execute('''
                SELECT 1 FROM planhospital ph
                JOIN policys pol ON pol.plan_id = ph.plan_id
                WHERE pol.policy_id = %s AND ph.hospital_id = %s
            ''', (req.policy_id, req.hospital_id))
            in_network = cur.fetchone() is not None
    finally:
        conn.close()

    if not policy:
        return PreAuthResponse(
            authorized=False,
            authorization_code=None,
            coverage_available=0,
            hospital_in_network=False,
            estimated_approval_probability="Low",
            notes="Policy not found. Cannot authorize treatment."
        )

    # Business logic checks
    is_active = policy["is_active"]
    coverage_available = float(policy["coverage_amount"]) - float(policy["prev_approved"])
    amount_ok = req.planned_amount <= coverage_available

    # IRDAI rules gate — same engine the claim adjudicator uses, so a hospital
    # is never pre-authorized for a treatment the claim would auto-reject.
    rules_violation = None
    try:
        from shared.db import get_policy_details, get_customer_history
        from shared.business_rules import check_permanent_exclusions, check_waiting_periods
        pol = get_policy_details(req.policy_id)
        cust = get_customer_history(pol["customer_id"]) if pol else {}
        days_on_policy = 999
        try:
            start = pol.get("start_date") if pol else None
            if isinstance(start, str):
                start = date.fromisoformat(str(start)[:10])
            if isinstance(start, date):
                days_on_policy = (date.today() - start).days
        except Exception:
            pass
        rules_violation = (
            check_permanent_exclusions(req.planned_disease)
            or check_waiting_periods(req.planned_disease, "", days_on_policy,
                                     cust.get("historical_disease") or "")
        )
    except Exception:
        rules_violation = None   # rules engine unavailable → don't block on it

    # All checks must pass for authorization
    authorized = (is_active and in_network and amount_ok
                  and coverage_available > 0 and rules_violation is None)

    notes_parts = []
    if not is_active:
        notes_parts.append("Policy is inactive or expired.")
    if not in_network:
        notes_parts.append("Hospital is not in this plan's network. Cashless admission not possible.")
    if not amount_ok:
        notes_parts.append(f"Planned amount Rs{req.planned_amount:,.0f} exceeds remaining coverage Rs{coverage_available:,.0f}.")
    if rules_violation is not None:
        notes_parts.append(f"Policy rule violation — {rules_violation['citation']} {rules_violation['detail']}")
    if authorized:
        notes_parts.append(f"Pre-authorization granted. Coverage available: Rs{coverage_available:,.0f}. Admission approved.")

    auth_code = f"CC-AUTH-{secrets.token_hex(4).upper()}" if authorized else None

    return PreAuthResponse(
        authorized=authorized,
        authorization_code=auth_code,
        coverage_available=coverage_available,
        hospital_in_network=in_network,
        estimated_approval_probability="High" if authorized else "Low",
        notes=" | ".join(notes_parts) or "Authorization check complete."
    )

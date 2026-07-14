"""
agents/fraud_detector/router.py — Fraud Detector Agent Router
Exposes:
  GET /agent/fraud-score/{claim_id} — algorithmic 0-100 fraud risk score
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from shared.db import get_customer_history, get_policy_details, get_previous_claims_total

router = APIRouter()


class FraudScoreResponse(BaseModel):
    claim_id: int
    score: int
    risk_level: str
    indicators: List[str]


@router.get("/agent/fraud-score/{claim_id}", response_model=FraudScoreResponse)
def calculate_fraud_score(claim_id: int):
    """
    Algorithmic fraud scoring (0-100). Pure rule-based logic — instant, no LLM.
    Scores are written back to the Claims table for persistence.
    """
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
    )
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('SELECT * FROM claims WHERE claim_id = %s', (claim_id,))
            claim = cur.fetchone()
            claim = dict(claim) if claim else None
    finally:
        conn.close()

    if not claim:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found")

    policy_id    = claim.get("policy_id")
    disease      = claim.get("disease", "") or ""
    claim_amount = float(claim.get("claim_amount", 0))

    policy = get_policy_details(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail=f"Policy {policy_id} not found")

    customer_id       = policy.get("customer_id")
    customer          = get_customer_history(customer_id)
    historical_disease = (customer.get("historical_disease") or "No").strip().lower()
    coverage_amount    = float(policy.get("coverage_amount", 0))
    prev_approved      = float(get_previous_claims_total(policy_id))
    remaining_coverage = coverage_amount - prev_approved

    score      = 0
    indicators = []

    # ── Rule 5: Early claim (IRDAI standard — most important temporal signal) ──
    try:
        start = policy.get("start_date")
        if isinstance(start, str):
            from datetime import date
            start = date.fromisoformat(str(start)[:10])
        from datetime import date as _date
        days_on_policy = (_date.today() - start).days if isinstance(start, _date) else 999
    except Exception:
        days_on_policy = 999

    if days_on_policy < 30:
        score += 35
        indicators.append(f"Claim filed only {days_on_policy} days after policy start — within initial waiting period.")
    elif days_on_policy < 90 and claim_amount > 50_000:
        score += 20
        indicators.append(f"Large claim (\u20b9{claim_amount:,.0f}) within {days_on_policy} days of policy start.")

    # ── Rule 6: Claim frequency on this policy ────────────────────────────────
    try:
        conn_freq = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
        with conn_freq.cursor() as _cur:
            _cur.execute('SELECT COUNT(*) FROM claims WHERE policy_id = %s AND claim_id != %s', (policy_id, claim_id))
            prior_claims = int(_cur.fetchone()[0])
        conn_freq.close()
        if prior_claims >= 3:
            score += 20
            indicators.append(f"This policy already has {prior_claims} prior claims — unusually high frequency.")
        elif prior_claims == 2:
            score += 10
            indicators.append(f"This is the 3rd claim on this policy.")
    except Exception:
        prior_claims = 0

    # ── Rule 7: Coverage exhaustion attempt ────────────────────────────────────
    exhaustion_ratio = claim_amount / coverage_amount if coverage_amount > 0 else 0
    if exhaustion_ratio > 0.8:
        score += 15
        indicators.append(f"Claim would consume {exhaustion_ratio*100:.0f}% of total coverage in one submission.")

    # ── Rule 1: Disease mismatch ───────────────────────────────────────────────
    major_diseases = ["cardiac", "cancer", "transplant", "tumor", "bypass", "surgery", "kidney"]
    is_major = any(kw in disease.lower() for kw in major_diseases)

    if historical_disease in ("no", "none", "") and is_major:
        score += 40
        indicators.append(f"Major disease ({disease}) claimed with no medical history.")
    elif historical_disease not in ("no", "none", "") and historical_disease not in disease.lower():
        score += 15
        indicators.append(f"Claimed '{disease}' does not match history of '{historical_disease}'.")

    # Rule 2 — Claim vs remaining coverage
    if remaining_coverage > 0:
        utilization = claim_amount / remaining_coverage
        if utilization > 0.8:
            score += 25
            indicators.append(f"Claim is {utilization*100:.0f}% of remaining coverage.")
        elif utilization > 0.5:
            score += 10
            indicators.append(f"Claim uses {utilization*100:.0f}% of remaining coverage.")

    # Rule 3 — High absolute amount
    if claim_amount > 200_000:
        score += 15
        indicators.append(f"High claim value (₹{claim_amount:,.0f}).")

    # Rule 4 — Very high amount (above 4L)
    if claim_amount > 400_000:
        score += 10
        indicators.append(f"Exceptionally high claim (₹{claim_amount:,.0f}). Requires extra scrutiny.")

    score = min(score, 100)
    risk_level = "High" if score >= 60 else "Medium" if score >= 30 else "Low"

    # Persist fraud score back to DB
    conn2 = psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
    )
    try:
        with conn2.cursor() as cur:
            cur.execute('UPDATE claims SET fraud_score = %s WHERE claim_id = %s', (score, claim_id))
        conn2.commit()
    finally:
        conn2.close()

    return FraudScoreResponse(
        claim_id=claim_id,
        score=score,
        risk_level=risk_level,
        indicators=indicators,
    )

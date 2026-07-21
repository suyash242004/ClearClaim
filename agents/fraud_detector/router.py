"""
agents/fraud_detector/router.py — Fraud Detector Agent Router
Exposes:
  GET /agent/fraud-score/{claim_id} — algorithmic 0-100 fraud risk score

score_fraud_core is the pure rules engine, extracted verbatim from the
original calculate_fraud_score body (no threshold/logic changes) so it can
be driven either by a DB-fetched claim (Mode A, claim_id) or an external
buyer's payload (Mode B, score_fraud_from_payload) with identical scoring.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Tuple

from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from shared.db import get_customer_history, get_policy_details, get_previous_claims_total

router = APIRouter()


class FraudScoreResponse(BaseModel):
    claim_id: int
    score: int
    risk_level: str
    indicators: List[str]


def score_fraud_core(disease: str, claim_amount: float, coverage_amount: float,
                     historical_disease: str, remaining_coverage: float,
                     days_on_policy: int, prior_claims: int) -> Tuple[int, List[str]]:
    """
    Pure fraud-scoring rules — byte-identical to the original inline logic in
    calculate_fraud_score (same order, same thresholds, same messages).
    """
    score      = 0
    indicators = []

    # ── Rule 5: Early claim (IRDAI standard — most important temporal signal) ──
    if days_on_policy < 30:
        score += 35
        indicators.append(f"Claim filed only {days_on_policy} days after policy start — within initial waiting period.")
    elif days_on_policy < 90 and claim_amount > 50_000:
        score += 20
        indicators.append(f"Large claim (₹{claim_amount:,.0f}) within {days_on_policy} days of policy start.")

    # ── Rule 6: Claim frequency on this policy ────────────────────────────────
    if prior_claims >= 3:
        score += 20
        indicators.append(f"This policy already has {prior_claims} prior claims — unusually high frequency.")
    elif prior_claims == 2:
        score += 10
        indicators.append(f"This is the 3rd claim on this policy.")

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
    return score, indicators


def risk_level_for(score: int) -> str:
    return "High" if score >= 60 else "Medium" if score >= 30 else "Low"


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

    # ── Days on policy (IRDAI temporal signal) ──────────────────────────────
    try:
        start = policy.get("start_date")
        if isinstance(start, str):
            from datetime import date
            start = date.fromisoformat(str(start)[:10])
        from datetime import date as _date
        days_on_policy = (_date.today() - start).days if isinstance(start, _date) else 999
    except Exception:
        days_on_policy = 999

    # ── Claim frequency on this policy ──────────────────────────────────────
    try:
        conn_freq = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
        with conn_freq.cursor() as _cur:
            _cur.execute('SELECT COUNT(*) FROM claims WHERE policy_id = %s AND claim_id != %s', (policy_id, claim_id))
            prior_claims = int(_cur.fetchone()[0])
        conn_freq.close()
    except Exception:
        prior_claims = 0

    score, indicators = score_fraud_core(
        disease=disease, claim_amount=claim_amount, coverage_amount=coverage_amount,
        historical_disease=historical_disease, remaining_coverage=remaining_coverage,
        days_on_policy=days_on_policy, prior_claims=prior_claims,
    )
    risk_level = risk_level_for(score)

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


# ── Mode B: stateless scoring from an external buyer's payload ──────────────
REQUIRED_FRAUD_PAYLOAD_FIELDS = ("disease", "claim_amount", "coverage_amount")


def score_fraud_from_payload(params: dict) -> dict:
    """
    Stateless fraud scoring for external buyers who have no claim_id in our
    DB — drives the SAME score_fraud_core rules from the submitted payload
    instead of a DB row. Never reads or writes the DB.

    Required: disease, claim_amount, coverage_amount (scoring is not
    meaningful without them — a silent default would produce a misleading
    score, so this errors clearly instead, per the "never a crash" contract).
    Optional (safe defaults): previously_approved_total=0,
    days_since_policy_start=999 (no early-claim signal — matches the DB
    path's own except-fallback), historical_disease="No", prior_claim_count=0.
    """
    missing = [f for f in REQUIRED_FRAUD_PAYLOAD_FIELDS if params.get(f) in (None, "")]
    if missing:
        raise ValueError(f"Missing required field(s): {', '.join(missing)}")

    disease              = str(params["disease"])
    claim_amount         = float(params["claim_amount"])
    coverage_amount      = float(params["coverage_amount"])
    prev_approved_total  = float(params.get("previously_approved_total", 0) or 0)
    days_on_policy       = int(params.get("days_since_policy_start", 999) or 999)
    historical_disease   = str(params.get("historical_disease", "No") or "No").strip().lower()
    prior_claims         = int(params.get("prior_claim_count", 0) or 0)
    remaining_coverage   = coverage_amount - prev_approved_total

    score, indicators = score_fraud_core(
        disease=disease, claim_amount=claim_amount, coverage_amount=coverage_amount,
        historical_disease=historical_disease, remaining_coverage=remaining_coverage,
        days_on_policy=days_on_policy, prior_claims=prior_claims,
    )
    return {
        "claim_id": None,
        "score": score,
        "risk_level": risk_level_for(score),
        "indicators": indicators,
        "mode": "payload",
    }

"""
agents/predictive_risk/router.py — Predictive Risk Agent (Agent 5)

Scans all active policies and scores each customer's health risk for the next 6 months.
Runs autonomously via APScheduler (nightly at 2 AM) AND on-demand via API.

Endpoints:
  GET  /agent/predictive-scan           — Scan all active customers now
  GET  /agent/predictive-scan/{customer_id} — Scan one customer
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import anyio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

from shared.db import (
    get_active_policies_with_customers,
    get_customer_recent_claims,
    get_customer_history,
    get_db_connection,
)
from shared.gemini_client import generate_json_response
from shared.prompts import PREDICTIVE_RISK_PROMPT

router = APIRouter()

# Risk threshold above which Health Guardian is triggered
HIGH_RISK_THRESHOLD = 0.65


class RiskScanResult(BaseModel):
    customer_id: int
    customer_name: str
    risk_score: float
    risk_level: str
    predicted_conditions: List[str]
    risk_factors: List[str]
    recommended_action: str
    urgency: str
    guardian_triggered: bool = False


def _calculate_risk_locally(customer: dict, recent_claims: list) -> dict:
    """
    Fast local risk estimate (no LLM) as a pre-filter before calling Gemini.
    Returns a score 0.0-1.0 to decide if we even need Gemini for this patient.
    """
    score = 0.0
    factors = []

    age = customer.get("age", 0) or 0
    historical = (customer.get("historical_disease") or "No").strip().lower()
    has_history = historical not in ("no", "none", "")

    # Age risk
    if age > 60:
        score += 0.35
        factors.append(f"Age {age} (senior citizen)")
    elif age > 50:
        score += 0.20
        factors.append(f"Age {age} (pre-senior)")
    elif age > 40:
        score += 0.10
        factors.append(f"Age {age}")

    # Existing disease
    if has_history:
        score += 0.30
        factors.append(f"Pre-existing: {historical}")

    # Claim frequency
    recent_count = len(recent_claims)
    if recent_count >= 3:
        score += 0.25
        factors.append(f"{recent_count} claims in past 12 months")
    elif recent_count == 2:
        score += 0.15
        factors.append(f"{recent_count} claims in past 12 months")
    elif recent_count == 1:
        score += 0.05

    return {"local_score": min(score, 1.0), "local_factors": factors}


async def _scan_customer(policy: dict) -> Optional[RiskScanResult]:
    """Full risk scan for one customer: local pre-check + optional Gemini analysis."""
    customer_id = policy["customer_id"]
    recent_claims = get_customer_recent_claims(customer_id, months=12)

    pre = _calculate_risk_locally(policy, recent_claims)
    local_score = pre["local_score"]

    # Only call Gemini for customers with non-trivial local risk (save API quota)
    if local_score < 0.15:
        # Low risk — no Gemini needed, return minimal result
        _save_risk_score(customer_id, local_score)
        return RiskScanResult(
            customer_id=customer_id,
            customer_name=policy.get("customer_name", "Unknown"),
            risk_score=local_score,
            risk_level="Low",
            predicted_conditions=[],
            risk_factors=["No significant risk factors identified"],
            recommended_action="Annual health checkup recommended",
            urgency="low",
            guardian_triggered=False,
        )

    # Moderate/High risk → ask Gemini for deeper analysis
    recent_summary = "; ".join(
        f"{c.get('disease', 'Unknown')} Rs{c.get('claim_amount', 0)}"
        for c in recent_claims[:5]
    ) or "No recent claims"

    days_on_policy = 0
    try:
        start = policy.get("start_date")
        if isinstance(start, str):
            start = date.fromisoformat(str(start)[:10])
        if isinstance(start, date):
            days_on_policy = (date.today() - start).days
    except Exception:
        pass

    prompt = PREDICTIVE_RISK_PROMPT.format(
        customer_name=policy.get("customer_name", "Unknown"),
        age=policy.get("age", "N/A"),
        gender=policy.get("gender", "N/A"),
        historical_disease=policy.get("historical_disease", "No"),
        city=policy.get("city", "N/A"),
        recent_claims_summary=recent_summary,
        coverage_amount=policy.get("coverage_amount", 0),
        days_on_policy=days_on_policy,
    )

    try:
        ai = await anyio.to_thread.run_sync(generate_json_response, prompt)
        risk_score = float(ai.get("risk_score", local_score))
        if risk_score < 0.3:
            risk_level = "Low"
        elif risk_score >= 0.6:
            risk_level = "High"
        else:
            risk_level = "Medium"
        
        predicted = ai.get("predicted_conditions", [])
        factors = ai.get("risk_factors", pre["local_factors"])
        action = ai.get("recommended_action", "Consult a physician")
        urgency = ai.get("urgency", "medium")
    except Exception as e:
        print(f"[PredictiveRisk] Gemini failed for customer {customer_id}: {e}")
        risk_score = local_score
        risk_level = "Medium" if local_score > 0.4 else "Low"
        predicted = []
        factors = pre["local_factors"]
        action = "Consult a physician for routine checkup"
        urgency = "medium" if local_score > 0.4 else "low"

    _save_risk_score(customer_id, risk_score)

    # Record risk score onchain
    risk_tx = None
    try:
        from shared.blockchain import record_risk_score
        risk_tx = await anyio.to_thread.run_sync(lambda: record_risk_score(
            customer_id=customer_id,
            risk_score=risk_score,
            risk_level=risk_level,
            predicted_conditions=predicted,
            guardian_triggered=False,  # updated below
        ))
    except Exception as e:
        print(f"[PredictiveRisk] Blockchain write skipped: {e}")

    # Trigger Health Guardian for high-risk patients
    guardian_triggered = False
    if risk_score >= HIGH_RISK_THRESHOLD:
        try:
            from health_guardian.router import generate_care_plan, CarePlanRequest
            req = CarePlanRequest(
                risk_score=risk_score,
                risk_factors=factors,
                plan_name=policy.get("plan_name", "Insurance Plan"),
                coverage_amount=policy.get("coverage_amount", 0),
            )
            await generate_care_plan(customer_id, req)
            guardian_triggered = True
        except Exception as e:
            print(f"[PredictiveRisk] Health Guardian trigger failed for customer {customer_id}: {e}")

    return RiskScanResult(
        customer_id=customer_id,
        customer_name=policy.get("customer_name", "Unknown"),
        risk_score=risk_score,
        risk_level=risk_level,
        predicted_conditions=predicted,
        risk_factors=factors,
        recommended_action=action,
        urgency=urgency,
        guardian_triggered=guardian_triggered,
    )


def _save_risk_score(customer_id: int, risk_score: float):
    """Persist risk score to Customer.risk_score column."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                'UPDATE customer SET risk_score = %s WHERE customer_id = %s',
                (round(risk_score, 4), customer_id)
            )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[PredictiveRisk] Failed to save risk score for customer {customer_id}: {e}")


@router.get("/agent/predictive-scan", response_model=List[RiskScanResult])
async def scan_all_customers():
    """
    Runs predictive risk scan on ALL active policy holders.
    Called by APScheduler nightly AND available on-demand for admin demo.
    High-risk customers automatically trigger the Health Guardian agent.
    """
    policies = get_active_policies_with_customers()
    if not policies:
        return []

    # One scan per CUSTOMER, not per policy — a customer with 3 policies was
    # being scanned 3 times (3× Gemini cost, 3 duplicate onchain writes).
    seen_customers: set = set()
    unique_policies = []
    for policy in policies:
        cid = policy.get("customer_id")
        if cid in seen_customers:
            continue
        seen_customers.add(cid)
        unique_policies.append(policy)

    results = []
    for policy in unique_policies:
        result = await _scan_customer(policy)
        if result:
            results.append(result)

    # Sort by risk_score descending so highest risk shows first
    results.sort(key=lambda r: r.risk_score, reverse=True)
    return results


@router.get("/agent/predictive-scan/{customer_id}", response_model=RiskScanResult)
async def scan_one_customer(customer_id: int):
    """Runs predictive risk scan for a single customer."""
    policies = get_active_policies_with_customers()
    policy = next((p for p in policies if p["customer_id"] == customer_id), None)

    if not policy:
        # Fall back to customer-only data
        customer = get_customer_history(customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
        policy = {**customer, "coverage_amount": 0, "plan_name": "Unknown", "start_date": None}

    result = await _scan_customer(policy)
    if not result:
        raise HTTPException(status_code=500, detail="Risk scan failed")
    return result

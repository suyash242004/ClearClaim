"""
agents/health_guardian/router.py — Health Guardian Agent (Agent 6)

Generates personalized 90-day preventive care plans for high-risk patients.
Triggered automatically by the Predictive Risk Agent when risk_score >= 0.65.
Also callable directly from the Customer Dashboard.

Endpoints:
  POST /agent/health-guardian/{customer_id} — Generate/refresh care plan
  GET  /agent/health-guardian/{customer_id} — Get existing care plan
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import anyio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
import json

from shared.db import (
    get_customer_history,
    get_db_connection,
    store_patient_intervention,
    get_patient_intervention,
)
from shared.gemini_client import generate_json_response
from shared.prompts import HEALTH_GUARDIAN_PROMPT

router = APIRouter()


class RecommendedTest(BaseModel):
    test: str
    reason: str
    frequency: str
    covered: bool


class CarePlanRequest(BaseModel):
    risk_score: float
    risk_factors: List[str]
    plan_name: str
    coverage_amount: Any  # numeric


class CarePlanResponse(BaseModel):
    customer_id: int
    customer_name: str
    greeting: str
    summary: str
    recommended_tests: List[RecommendedTest]
    lifestyle_tips: List[str]
    doctor_recommendation: str
    specialist_referral: str
    urgency_message: str
    estimated_savings: str
    risk_score: float
    is_new: bool = True


@router.post("/agent/health-guardian/{customer_id}", response_model=CarePlanResponse)
async def generate_care_plan(customer_id: int, req: CarePlanRequest):
    """
    Generates a personalized 90-day preventive care plan using Gemini 2.5 Flash.
    Stores the plan in PatientInterventions table — Customer Dashboard displays it.
    Called automatically by Predictive Risk Agent for high-risk patients.
    """
    customer = get_customer_history(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

    customer_name = customer.get("customer_name", customer)
    age           = customer.get("age", "N/A")
    gender        = customer.get("gender", "N/A")
    historical    = customer.get("historical_disease", "No") or "No"

    prompt = HEALTH_GUARDIAN_PROMPT.format(
        customer_name=customer_name,
        age=age,
        gender=gender,
        historical_disease=historical,
        risk_score=round(req.risk_score, 2),
        risk_factors=", ".join(req.risk_factors),
        plan_name=req.plan_name,
        coverage_amount=req.coverage_amount,
    )

    try:
        ai = await anyio.to_thread.run_sync(generate_json_response, prompt)
    except Exception as e:
        # Fallback plan if Gemini fails
        ai = {
            "greeting": f"Hi {customer_name}, your AI Health Guardian has a message for you.",
            "summary": "We recommend scheduling a routine health checkup as a preventive measure.",
            "recommended_tests": [
                {"test": "Complete Blood Count (CBC)", "reason": "Baseline health check", "frequency": "Annually", "covered": True},
                {"test": "Lipid Profile", "reason": "Cardiovascular risk assessment", "frequency": "Annually", "covered": True},
            ],
            "lifestyle_tips": [
                "30 minutes of walking 5 days per week",
                "Maintain a balanced diet with reduced processed foods",
                "Stay hydrated — at least 2L of water daily",
            ],
            "doctor_recommendation": "Schedule a consultation with a General Physician within 4 weeks.",
            "specialist_referral": "Based on your profile, a specialist consultation may be beneficial.",
            "urgency_message": "These are preventive steps. You are not in immediate danger.",
            "estimated_savings": "Preventive care can save significant healthcare costs in the long run.",
        }

    # Build the tests list safely
    raw_tests = ai.get("recommended_tests", [])
    tests = []
    for t in raw_tests:
        if isinstance(t, dict):
            tests.append(RecommendedTest(
                test=t.get("test", "Health Test"),
                reason=t.get("reason", ""),
                frequency=t.get("frequency", "Once"),
                covered=bool(t.get("covered", True)),
            ))

    care_plan = {
        "greeting":              ai.get("greeting", ""),
        "summary":               ai.get("summary", ""),
        "recommended_tests":     [t.dict() for t in tests],
        "lifestyle_tips":        ai.get("lifestyle_tips", []),
        "doctor_recommendation": ai.get("doctor_recommendation", ""),
        "specialist_referral":   ai.get("specialist_referral", ""),
        "urgency_message":       ai.get("urgency_message", ""),
        "estimated_savings":     ai.get("estimated_savings", ""),
    }

    # Persist to PatientInterventions table
    store_patient_intervention(
        customer_id=customer_id,
        risk_score=req.risk_score,
        risk_factors=req.risk_factors,
        care_plan=care_plan,
    )

    # Record intervention onchain — this is the most unique proof
    # "AI acted BEFORE any claim was filed" — immutable on X Layer
    try:
        from shared.blockchain import record_intervention
        await anyio.to_thread.run_sync(lambda: record_intervention(
            customer_id=customer_id,
            risk_score=req.risk_score,
            care_plan=care_plan,
            risk_factors=req.risk_factors,
        ))
    except Exception as e:
        # Non-fatal — care plan is already saved to DB
        print(f"[HealthGuardian] Blockchain write skipped for customer {customer_id}: {e}")

    return CarePlanResponse(
        customer_id=customer_id,
        customer_name=customer_name,
        greeting=care_plan["greeting"],
        summary=care_plan["summary"],
        recommended_tests=tests,
        lifestyle_tips=care_plan["lifestyle_tips"],
        doctor_recommendation=care_plan["doctor_recommendation"],
        specialist_referral=care_plan["specialist_referral"],
        urgency_message=care_plan["urgency_message"],
        estimated_savings=care_plan["estimated_savings"],
        risk_score=req.risk_score,
        is_new=True,
    )


@router.get("/agent/health-guardian/{customer_id}", response_model=CarePlanResponse)
def get_care_plan(customer_id: int):
    """
    Returns the latest stored care plan for a customer.
    Customer Dashboard calls this on load to show the Health Guardian alert card.
    """
    intervention = get_patient_intervention(customer_id)
    if not intervention:
        raise HTTPException(
            status_code=404,
            detail=f"No Health Guardian plan exists for customer {customer_id}. "
                   f"Run /agent/predictive-scan first."
        )

    customer = get_customer_history(customer_id)
    customer_name = customer.get("customer_name", customer) if customer else customer

    care = intervention.get("care_plan", {})
    if isinstance(care, str):
        care = json.loads(care)

    raw_tests = care.get("recommended_tests", [])
    tests = []
    for t in raw_tests:
        if isinstance(t, dict):
            tests.append(RecommendedTest(
                test=t.get("test", "Health Test"),
                reason=t.get("reason", ""),
                frequency=t.get("frequency", "Once"),
                covered=bool(t.get("covered", True)),
            ))

    return CarePlanResponse(
        customer_id=customer_id,
        customer_name=customer_name,
        greeting=care.get("greeting", f"Hi {customer_name}, your Health Guardian has a message."),
        summary=care.get("summary", ""),
        recommended_tests=tests,
        lifestyle_tips=care.get("lifestyle_tips", []),
        doctor_recommendation=care.get("doctor_recommendation", ""),
        specialist_referral=care.get("specialist_referral", ""),
        urgency_message=care.get("urgency_message", ""),
        estimated_savings=care.get("estimated_savings", ""),
        risk_score=float(intervention.get("risk_score", 0)),
        is_new=not intervention.get("is_read", False),
    )

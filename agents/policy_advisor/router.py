"""
agents/policy_advisor/router.py — Policy Advisor Agent (Agent 3)
Exposes:
  POST /agent/recommend-policy — Gemini-powered plan recommendation
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2.extras import RealDictCursor
import anyio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from shared.gemini_client import generate_json_response
from shared.rag import semantic_search

router = APIRouter()


class PolicyRecommendationRequest(BaseModel):
    age: int
    family_size: int
    budget: int          # ANNUAL budget in INR — plans are priced yearly
    medical_history: str
    city: str

    @field_validator("age")
    @classmethod
    def validate_age(cls, v):
        if v <= 0 or v > 120:
            raise ValueError("Age must be between 1 and 120")
        return v

    @field_validator("family_size")
    @classmethod
    def validate_family_size(cls, v):
        if v <= 0 or v > 20:
            raise ValueError("Family size must be between 1 and 20")
        return v

    @field_validator("budget")
    @classmethod
    def validate_budget(cls, v):
        if v <= 0:
            raise ValueError("Annual budget must be greater than 0")
        return v


class PolicyRecommendationResponse(BaseModel):
    recommended_plan_id: int
    recommended_plan_name: str
    reasoning: str
    confidence_score: float


@router.post("/agent/recommend-policy", response_model=PolicyRecommendationResponse)
async def recommend_policy(request: PolicyRecommendationRequest):
    """
    Gemini-powered policy recommendation based on customer profile.
    Budget is ANNUAL (same unit as plan premium_amount in DB).
    Reads available plans from DB and asks Gemini to pick the best fit.
    """
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
    )
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                'SELECT plan_id, plan_name, premium_amount, coverage_amount, max_members, policy_duration '
                'FROM "insuranceplan" ORDER BY plan_id'
            )
            plans = cur.fetchall()
    finally:
        conn.close()

    if not plans:
        raise HTTPException(status_code=500, detail="No insurance plans found in the system.")

    # Build plan descriptions — ALL amounts are ANNUAL
    plans_text = "\n".join(
        f"  Plan {p['plan_id']}: {p['plan_name']} | "
        f"Annual Premium: Rs{p['premium_amount']}/year | "
        f"Total Coverage: Rs{p['coverage_amount']} | "
        f"Max Members: {p['max_members']} | Duration: {p['policy_duration']} year(s)"
        for p in plans
    )

    # Warn Gemini if budget is very low (user may have typed monthly thinking it converts)
    budget_note = ""
    min_premium = min(float(p["premium_amount"]) for p in plans)
    if request.budget < min_premium:
        budget_note = (
            f"\nNOTE: Customer budget Rs{request.budget}/year is below the minimum plan premium "
            f"of Rs{min_premium}/year. Recommend the most affordable plan and explain the gap clearly."
        )

    # RAG Semantic Search — best-effort: a failed embedding must never 500 the endpoint
    rag_query = f"Medical History: {request.medical_history}. Age: {request.age}"
    try:
        retrieved_clauses = await anyio.to_thread.run_sync(lambda: semantic_search(rag_query, top_k=2))
        rag_context = "\n".join([f"- {clause}" for clause in retrieved_clauses])
    except Exception as e:
        rag_context = "(policy clause retrieval unavailable — rely on the rules above)"

    prompt = f"""You are ClearClaim AI, a compassionate and knowledgeable medical insurance advisor.
Recommend the single best insurance plan for this customer.

Customer Profile:
- Age: {request.age}
- Family Size: {request.family_size} members
- Annual Budget (max yearly premium): Rs{request.budget}/year
- Medical History: {request.medical_history}
- City: {request.city}

Available Plans (ALL premium amounts are ANNUAL, per year):
{plans_text}
{budget_note}

RAG Policy Clauses Retrieved (use to inform your recommendation):
{rag_context}

Decision Rules (apply in order):
1. MEMBER ELIGIBILITY: plan max_members must be >= family_size. Never recommend a plan that can't cover the family.
2. BUDGET FIT: annual premium_amount should ideally be <= customer annual budget. If it exceeds, explain why the higher plan is worth it.
3. MEDICAL HISTORY: For Diabetes, Hypertension, Cardiac conditions — prefer higher coverage (Rs10L+).
4. FAMILY TYPE:
   - family_size=1 → Personal Medical Insurance (Plan 1)
   - family_size=2-4, no parents → Family Medical Insurance (Plan 2)
   - family_size=2, seniors/parents → Parent Medical Insurance (Plan 3)
   - family_size=5-8, large family → Complete Family Medical Insurance (Plan 4)
5. Explain coverage vs premium trade-off in plain, friendly language.
6. CRITICAL: Keep your `reasoning` extremely concise and brief (under 2 sentences max). Do not generate long paragraphs.

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "recommended_plan_id": 2,
  "recommended_plan_name": "Family Medical Insurance",
  "reasoning": "With a family of 4 and an annual budget of Rs15,000, the Family Plan is your ideal choice. It covers all 4 members with Rs9,00,000 total coverage at Rs10,000/year.",
  "confidence_score": 0.92
}}"""

    result = await anyio.to_thread.run_sync(generate_json_response, prompt)

    return PolicyRecommendationResponse(
        recommended_plan_id=int(result.get("recommended_plan_id", 0)),
        recommended_plan_name=result.get("recommended_plan_name", "Unknown"),
        reasoning=result.get("reasoning", "No reasoning provided."),
        confidence_score=float(result.get("confidence_score", 0.0)),
    )

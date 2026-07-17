"""
agents/policy_advisor/router.py — Policy Advisor Agent (Agent 3)
Exposes:
  POST /agent/recommend-policy — Gemini-powered plan recommendation

Resilience contract (OKX x402 review round 5): a paid call MUST return a real
recommendation well inside the 300s x402 window. Every external dependency is
bounded and has a fallback:
  DB (5s connect timeout)  → static plan catalog
  RAG embeddings (bounded) → skipped context
  Gemini (hard deadline)   → deterministic rules-based recommendation
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
import psycopg2
from psycopg2.extras import RealDictCursor
import anyio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator, model_validator

from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from shared.gemini_client import generate_json_response
from shared.rag import semantic_search

router = APIRouter()
logger = logging.getLogger("clearclaim.policy_advisor")

# Buyers reach this tool through OKX's x402 replay with param names we don't
# control ("annual_budget" was seen in the round-5 review). Map every known
# alias onto the canonical field instead of 422-ing a paid call.
PARAM_ALIASES = {
    "budget": ["budget", "annual_budget", "budget_inr", "annual_budget_inr",
               "max_premium", "max_annual_premium", "yearly_budget"],
    "age": ["age", "customer_age", "applicant_age"],
    "family_size": ["family_size", "familysize", "members", "family_members",
                    "num_members", "household_size"],
    "medical_history": ["medical_history", "medicalhistory", "conditions",
                        "pre_existing_conditions", "health_conditions", "history"],
    "city": ["city", "location", "region"],
}

# Snapshot of the Neon `insuranceplan` table (Jul 2026) — used when the DB is
# unreachable so a paid recommendation never depends on DB availability.
STATIC_PLANS = [
    {"plan_id": 1,  "plan_name": "Personal Medical Insurance",        "premium_amount": 7000,   "coverage_amount": 500000,   "max_members": 1, "policy_duration": 1},
    {"plan_id": 2,  "plan_name": "Family Medical Insurance",          "premium_amount": 18500,  "coverage_amount": 1000000,  "max_members": 4, "policy_duration": 1},
    {"plan_id": 3,  "plan_name": "Parent Medical Insurance",          "premium_amount": 68000,  "coverage_amount": 1500000,  "max_members": 2, "policy_duration": 1},
    {"plan_id": 4,  "plan_name": "Complete Family Medical Insurance", "premium_amount": 38000,  "coverage_amount": 2500000,  "max_members": 8, "policy_duration": 1},
    {"plan_id": 5,  "plan_name": "Premium Individual Insurance",      "premium_amount": 24000,  "coverage_amount": 2500000,  "max_members": 1, "policy_duration": 1},
    {"plan_id": 6,  "plan_name": "Super Floater Family Plan",         "premium_amount": 42000,  "coverage_amount": 5000000,  "max_members": 4, "policy_duration": 1},
    {"plan_id": 7,  "plan_name": "Senior Citizen Gold Plan",          "premium_amount": 95000,  "coverage_amount": 2000000,  "max_members": 2, "policy_duration": 1},
    {"plan_id": 9,  "plan_name": "Critical Illness Shield",           "premium_amount": 14500,  "coverage_amount": 2000000,  "max_members": 1, "policy_duration": 1},
    {"plan_id": 10, "plan_name": "Maternity Care Plus",               "premium_amount": 22000,  "coverage_amount": 1000000,  "max_members": 2, "policy_duration": 1},
    {"plan_id": 11, "plan_name": "Startup Employee Basic",            "premium_amount": 4500,   "coverage_amount": 300000,   "max_members": 1, "policy_duration": 1},
    {"plan_id": 12, "plan_name": "Global Health Elite",               "premium_amount": 125000, "coverage_amount": 10000000, "max_members": 4, "policy_duration": 1},
    {"plan_id": 13, "plan_name": "Ayush Alternative Care",            "premium_amount": 5500,   "coverage_amount": 400000,   "max_members": 1, "policy_duration": 1},
]

CHRONIC_KEYWORDS = ("diabet", "hypertens", "cardiac", "heart", "cancer",
                    "asthma", "kidney", "liver", "stroke", "thyroid")


def normalize_policy_params(params: dict) -> dict:
    """Maps aliased/omitted buyer params onto the canonical request shape.
    Fills documented defaults for optional fields; never raises."""
    params = params or {}
    out = {}
    lower = {str(k).lower().strip(): v for k, v in params.items()}
    for canonical, aliases in PARAM_ALIASES.items():
        for alias in aliases:
            if alias in lower and lower[alias] not in (None, ""):
                out[canonical] = lower[alias]
                break
    # Documented defaults (see /mcp/tools inputSchema)
    out.setdefault("age", 35)
    out.setdefault("family_size", 1)
    out.setdefault("budget", 20000)
    out.setdefault("medical_history", "No")
    out.setdefault("city", "Unknown")
    # Coerce numerics that arrive as strings ("30000", "30,000")
    defaults = {"age": 35, "family_size": 1, "budget": 20000}
    for k in defaults:
        try:
            out[k] = int(float(str(out[k]).replace(",", "")))
        except (ValueError, TypeError):
            out[k] = defaults[k]
    out["medical_history"] = str(out["medical_history"])
    out["city"] = str(out["city"])
    return out


class PolicyRecommendationRequest(BaseModel):
    age: int
    family_size: int
    budget: int          # ANNUAL budget in INR — plans are priced yearly
    medical_history: str = "No"
    city: str = "Unknown"

    @model_validator(mode="before")
    @classmethod
    def _accept_aliases(cls, data):
        if isinstance(data, dict):
            return normalize_policy_params(data)
        return data

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


def _fetch_plans() -> list[dict]:
    """Reads the plan catalog; falls back to the static snapshot if the DB is
    slow or down. connect_timeout keeps the worst case at ~5s."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST, port=DB_PORT,
            dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD,
            connect_timeout=5,
        )
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    'SELECT plan_id, plan_name, premium_amount, coverage_amount, max_members, policy_duration '
                    'FROM "insuranceplan" ORDER BY plan_id'
                )
                plans = [dict(p) for p in cur.fetchall()]
        finally:
            conn.close()
        if plans:
            return plans
    except Exception as e:
        logger.warning(f"[PolicyAdvisor] DB unavailable ({e}) — using static plan catalog.")
    return STATIC_PLANS


def _rules_based_recommendation(request: "PolicyRecommendationRequest",
                                plans: list[dict]) -> PolicyRecommendationResponse:
    """Deterministic fallback recommender implementing the same decision rules
    the Gemini prompt encodes. Guarantees a real recommendation in <1ms."""
    eligible = [p for p in plans if int(p["max_members"]) >= request.family_size]
    if not eligible:
        eligible = sorted(plans, key=lambda p: -int(p["max_members"]))[:3]

    chronic = any(k in request.medical_history.lower() for k in CHRONIC_KEYWORDS)
    senior = request.age >= 60

    in_budget = [p for p in eligible if float(p["premium_amount"]) <= request.budget]
    pool = in_budget or eligible

    if senior and request.family_size <= 2:
        preferred = [p for p in pool
                     if "senior" in p["plan_name"].lower() or "parent" in p["plan_name"].lower()]
        if preferred:
            pool = preferred
    if chronic:
        # Pre-existing conditions → prioritise highest coverage
        best = max(pool, key=lambda p: float(p["coverage_amount"]))
    else:
        # Best coverage-per-rupee within budget
        best = max(pool, key=lambda p: float(p["coverage_amount"]) / max(float(p["premium_amount"]), 1.0))

    premium = float(best["premium_amount"])
    coverage = float(best["coverage_amount"])
    over_budget = premium > request.budget
    reasoning = (
        f"For a family of {request.family_size} with an annual budget of Rs{request.budget:,}, "
        f"{best['plan_name']} offers Rs{coverage:,.0f} coverage at Rs{premium:,.0f}/year"
    )
    if chronic:
        reasoning += ", prioritising high coverage for your pre-existing conditions"
    if over_budget:
        reasoning += f" (above your budget, but the closest eligible fit for {request.family_size} member(s))"
    reasoning += "."

    return PolicyRecommendationResponse(
        recommended_plan_id=int(best["plan_id"]),
        recommended_plan_name=str(best["plan_name"]),
        reasoning=reasoning,
        confidence_score=0.78 if over_budget else 0.88,
    )


@router.post("/agent/recommend-policy", response_model=PolicyRecommendationResponse)
async def recommend_policy(request: PolicyRecommendationRequest):
    """
    Gemini-powered policy recommendation based on customer profile.
    Budget is ANNUAL (same unit as plan premium_amount in DB).
    Falls back to the deterministic rules engine if Gemini is unavailable —
    this endpoint always returns a real recommendation.
    """
    plans = await anyio.to_thread.run_sync(_fetch_plans)
    fallback = _rules_based_recommendation(request, plans)

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
    except Exception:
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

    try:
        result = await anyio.to_thread.run_sync(lambda: generate_json_response(prompt, 1))
    except Exception as e:
        logger.warning(f"[PolicyAdvisor] Gemini call failed ({e}) — using rules-based recommendation.")
        return fallback

    # Accept the Gemini answer only if it names a real plan; otherwise the
    # deterministic recommendation goes out (never the adjudication 'Flag' stub).
    valid_ids = {int(p["plan_id"]) for p in plans}
    try:
        plan_id = int(result.get("recommended_plan_id", 0))
    except (ValueError, TypeError):
        plan_id = 0
    if plan_id not in valid_ids:
        logger.warning("[PolicyAdvisor] Gemini returned no usable plan — using rules-based recommendation.")
        return fallback

    return PolicyRecommendationResponse(
        recommended_plan_id=plan_id,
        recommended_plan_name=result.get("recommended_plan_name", fallback.recommended_plan_name),
        reasoning=result.get("reasoning", fallback.reasoning),
        confidence_score=float(result.get("confidence_score", 0.75)),
    )

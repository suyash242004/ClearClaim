"""
agents/policy_advisor/router.py — Policy Advisor Agent (Agent 3)
Exposes:
  POST /agent/recommend-policy — Gemini-powered plan recommendation

Resilience contract (OKX x402 reviews, rounds 5-6): a paid call MUST return a
real, personalised recommendation well inside the 300s x402 window.
  - Every external dependency is bounded and has a fallback:
      DB (5s connect timeout)  → static plan catalog
      RAG embeddings (bounded) → skipped context
      Gemini (hard deadline)   → deterministic rules-based recommendation
  - Buyer params are parsed aggressively, never silently replaced: budgets
    like "USD 9,000/yr" must parse as 9000 USD, not fall back to a default
    (round 6: an Austin, TX buyer's USD budget was dropped and the reviewer
    got a defaults-derived INR answer that looked like a hardcoded demo).
  - Output is localised to the buyer's currency; the catalog is INR-priced,
    so foreign-currency figures are converted and the FX assumption stated.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import re
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
# control ("annual_budget" round 5, "USD 9000" budgets round 6). Map every
# known alias onto the canonical field instead of 422-ing a paid call.
PARAM_ALIASES = {
    "budget": ["budget", "annual_budget", "budget_inr", "annual_budget_inr",
               "budget_usd", "annual_budget_usd", "usd_budget", "premium_budget",
               "max_budget", "max_premium", "max_annual_premium", "yearly_budget",
               "yearly_premium", "budget_per_year"],
    "age": ["age", "customer_age", "applicant_age"],
    "family_size": ["family_size", "familysize", "members", "family_members",
                    "num_members", "household_size", "dependents"],
    "medical_history": ["medical_history", "medicalhistory", "conditions",
                        "medical_conditions", "pre_existing_conditions",
                        "health_conditions", "health_history", "health", "history"],
    "city": ["city", "location", "region", "town", "place", "residence"],
    "currency": ["currency", "curr", "ccy", "budget_currency"],
}

# ── Currency / locale handling ───────────────────────────────────────────────
# The plan catalog is INR-denominated. Approximate FX (mid-2026), overridable
# via env, used only to match budgets and localise displayed figures.
CURRENCY_FX_TO_INR = {
    "INR": 1.0,
    "USD": float(os.getenv("FX_USD_INR", "84")),
    "EUR": float(os.getenv("FX_EUR_INR", "92")),
    "GBP": float(os.getenv("FX_GBP_INR", "107")),
    "AED": float(os.getenv("FX_AED_INR", "23")),
    "SGD": float(os.getenv("FX_SGD_INR", "63")),
}
CURRENCY_SYMBOL = {"INR": "Rs", "USD": "$", "EUR": "€", "GBP": "£",
                   "AED": "AED ", "SGD": "S$"}

_US_MARKERS = re.compile(
    r"\b(usa|u\.s\.a?|united states|america|austin|new york|nyc|san francisco|"
    r"los angeles|chicago|houston|dallas|seattle|boston|miami|denver|atlanta|"
    r"phoenix|philadelphia|san diego|san jose|portland|las vegas|"
    r"al|ak|az|ar|ca|co|ct|fl|ga|ia|id|il|ks|ky|la|ma|md|mi|mn|mo|ms|mt|nc|nd|"
    r"ne|nh|nj|nm|nv|pa|ri|sc|sd|tn|tx|ut|va|vt|wa|wi|wv|wy)\b", re.I)
_UK_MARKERS = re.compile(r"\b(uk|u\.k\.|united kingdom|england|london|scotland|wales)\b", re.I)
_EU_MARKERS = re.compile(r"\b(germany|france|spain|italy|netherlands|berlin|paris|madrid|amsterdam)\b", re.I)


def _detect_currency(raw_currency, budget_raw: str, budget_key: str, city: str) -> str:
    """Explicit currency param > markers in the budget value/key > city locale
    > INR (the catalog's native currency)."""
    if raw_currency:
        code = str(raw_currency).upper().strip().replace("US$", "USD").replace("$", "USD")
        if code in CURRENCY_FX_TO_INR:
            return code
    b = f"{budget_key} {budget_raw}".lower()
    if "usd" in b or "$" in b or "dollar" in b:
        return "USD"
    if "eur" in b or "€" in b:
        return "EUR"
    if "gbp" in b or "£" in b or "pound" in b:
        return "GBP"
    if "inr" in b or "rs" in b or "₹" in b or "rupee" in b or "lakh" in b:
        return "INR"
    if _US_MARKERS.search(city or ""):
        return "USD"
    if _UK_MARKERS.search(city or ""):
        return "GBP"
    if _EU_MARKERS.search(city or ""):
        return "EUR"
    return "INR"


def _extract_number(value, default=None):
    """Pulls the numeric part out of '9000', 9000, 'USD 9,000/yr', '$9000'.
    Returns default only when there is genuinely no number to parse."""
    if isinstance(value, (int, float)):
        return int(value)
    m = re.search(r"[\d][\d,]*(?:\.\d+)?", str(value or ""))
    if m:
        try:
            return int(float(m.group(0).replace(",", "")))
        except ValueError:
            pass
    return default


def _fmt(amount: float, currency: str) -> str:
    return f"{CURRENCY_SYMBOL.get(currency, currency + ' ')}{amount:,.0f}"


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

# keyword fragment → display name, so reasoning names the buyer's actual
# conditions ("asthma, hypertension") instead of a generic phrase (round 6).
CONDITION_NAMES = {
    "diabet": "diabetes", "hypertens": "hypertension", "cardiac": "cardiac condition",
    "heart": "heart condition", "cancer": "cancer history", "asthma": "asthma",
    "kidney": "kidney condition", "liver": "liver condition", "stroke": "stroke history",
    "thyroid": "thyroid condition", "blood pressure": "high blood pressure",
    "bp": "high blood pressure", "cholesterol": "high cholesterol",
}


def _named_conditions(medical_history: str) -> list:
    text = (medical_history or "").lower()
    found = []
    for frag, name in CONDITION_NAMES.items():
        if frag in text and name not in found:
            found.append(name)
    return found


def normalize_policy_params(params: dict) -> dict:
    """Maps aliased buyer params onto the canonical request shape, extracts
    numbers from currency-prefixed strings, and detects the buyer's currency.
    Fills documented defaults ONLY for genuinely absent fields; never raises."""
    params = params or {}
    out = {}
    lower = {str(k).lower().strip(): v for k, v in params.items()}
    matched_keys = {}
    for canonical, aliases in PARAM_ALIASES.items():
        for alias in aliases:
            if alias in lower and lower[alias] not in (None, ""):
                out[canonical] = lower[alias]
                matched_keys[canonical] = alias
                break

    budget_raw = str(out.get("budget", ""))
    budget_key = matched_keys.get("budget", "")
    out["currency"] = _detect_currency(out.get("currency"), budget_raw,
                                       budget_key, str(out.get("city", "")))
    # "budget_usd"-style keys are themselves a currency statement
    if "usd" in budget_key:
        out["currency"] = "USD"

    # Documented defaults (see /mcp/tools inputSchema) — absent fields only.
    # Default budget is in the detected currency's own scale.
    default_budget = 20000 if out["currency"] == "INR" else 3000
    out["age"] = _extract_number(out.get("age"), 35)
    out["family_size"] = _extract_number(out.get("family_size"), 1)
    out["budget"] = _extract_number(out.get("budget"), default_budget)
    out.setdefault("medical_history", "No")
    out.setdefault("city", "Unknown")
    out["medical_history"] = str(out["medical_history"])
    out["city"] = str(out["city"])
    return out


class PolicyRecommendationRequest(BaseModel):
    age: int
    family_size: int
    budget: int          # ANNUAL budget in the buyer's currency (see currency)
    medical_history: str = "No"
    city: str = "Unknown"
    currency: str = "INR"

    @model_validator(mode="before")
    @classmethod
    def _accept_aliases(cls, data):
        if isinstance(data, dict):
            return normalize_policy_params(data)
        return data

    @property
    def fx_to_inr(self) -> float:
        return CURRENCY_FX_TO_INR.get(self.currency, 1.0)

    @property
    def budget_inr(self) -> float:
        return self.budget * self.fx_to_inr

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
    # Localised figures (buyer's currency) — additive fields, round-6 review
    currency: str = "INR"
    annual_premium: float = 0
    coverage_amount: float = 0
    notes: str = ""


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


def _localise(response: PolicyRecommendationResponse,
              request: PolicyRecommendationRequest,
              plans: list[dict]) -> PolicyRecommendationResponse:
    """Fills the localised premium/coverage figures for the chosen plan and
    the FX disclosure note, in the buyer's currency."""
    plan = next((p for p in plans if int(p["plan_id"]) == response.recommended_plan_id), None)
    if not plan:
        return response
    fx = request.fx_to_inr
    response.currency = request.currency
    response.annual_premium = round(float(plan["premium_amount"]) / fx, 2)
    response.coverage_amount = round(float(plan["coverage_amount"]) / fx, 2)
    if request.currency != "INR":
        response.notes = (
            f"Plans are INR-denominated (Indian health insurance catalog); figures "
            f"converted at ~Rs{fx:.0f} per {request.currency}. "
            f"Premium Rs{float(plan['premium_amount']):,.0f}/yr, "
            f"coverage Rs{float(plan['coverage_amount']):,.0f}."
        )
    return response


def _rules_based_recommendation(request: PolicyRecommendationRequest,
                                plans: list[dict]) -> PolicyRecommendationResponse:
    """Deterministic fallback recommender implementing the same decision rules
    the Gemini prompt encodes — computed from the ACTUAL buyer inputs (age,
    family size, budget in their currency, named conditions, city)."""
    eligible = [p for p in plans if int(p["max_members"]) >= request.family_size]
    if not eligible:
        eligible = sorted(plans, key=lambda p: -int(p["max_members"]))[:3]

    conditions = _named_conditions(request.medical_history)
    senior = request.age >= 60
    budget_inr = request.budget_inr

    in_budget = [p for p in eligible if float(p["premium_amount"]) <= budget_inr]
    pool = in_budget or eligible

    if senior and request.family_size <= 2:
        preferred = [p for p in pool
                     if "senior" in p["plan_name"].lower() or "parent" in p["plan_name"].lower()]
        if preferred:
            pool = preferred
    if conditions:
        # Pre-existing conditions → prioritise highest coverage
        best = max(pool, key=lambda p: float(p["coverage_amount"]))
    else:
        # Best coverage-per-rupee within budget
        best = max(pool, key=lambda p: float(p["coverage_amount"]) / max(float(p["premium_amount"]), 1.0))

    fx = request.fx_to_inr
    ccy = request.currency
    premium_loc = float(best["premium_amount"]) / fx
    coverage_loc = float(best["coverage_amount"]) / fx
    over_budget = float(best["premium_amount"]) > budget_inr

    who = f"your family of {request.family_size}" if request.family_size > 1 else "you"
    where = f" in {request.city}" if request.city and request.city.lower() != "unknown" else ""
    reasoning = (
        f"For {who}{where} with an annual budget of {_fmt(request.budget, ccy)}, "
        f"{best['plan_name']} offers {_fmt(coverage_loc, ccy)} coverage at "
        f"{_fmt(premium_loc, ccy)}/year"
    )
    if conditions:
        reasoning += f", prioritising high coverage for your {', '.join(conditions)}"
    if over_budget:
        reasoning += (f" (above your stated budget, but the closest eligible fit "
                      f"for {request.family_size} member(s))")
    reasoning += "."

    resp = PolicyRecommendationResponse(
        recommended_plan_id=int(best["plan_id"]),
        recommended_plan_name=str(best["plan_name"]),
        reasoning=reasoning,
        confidence_score=0.78 if over_budget else 0.88,
    )
    return _localise(resp, request, plans)


@router.post("/agent/recommend-policy", response_model=PolicyRecommendationResponse)
async def recommend_policy(request: PolicyRecommendationRequest):
    """
    Gemini-powered policy recommendation based on customer profile.
    Budget is ANNUAL in the buyer's currency (auto-detected; catalog is INR).
    Falls back to the deterministic rules engine if Gemini is unavailable —
    this endpoint always returns a real, input-derived recommendation.
    """
    plans = await anyio.to_thread.run_sync(_fetch_plans)
    fallback = _rules_based_recommendation(request, plans)

    fx = request.fx_to_inr
    ccy = request.currency
    conditions = _named_conditions(request.medical_history)

    # Build plan descriptions — ALL amounts are ANNUAL
    plans_text = "\n".join(
        f"  Plan {p['plan_id']}: {p['plan_name']} | "
        f"Annual Premium: Rs{p['premium_amount']}/year | "
        f"Total Coverage: Rs{p['coverage_amount']} | "
        f"Max Members: {p['max_members']} | Duration: {p['policy_duration']} year(s)"
        for p in plans
    )

    currency_note = ""
    if ccy != "INR":
        currency_note = (
            f"\nIMPORTANT: The customer's budget is {_fmt(request.budget, ccy)} per year "
            f"({ccy}) ≈ Rs{request.budget_inr:,.0f}/year at ~Rs{fx:.0f}/{ccy}. "
            f"Plan prices above are in INR. In your `reasoning`, quote ALL figures in the "
            f"customer's currency ({ccy}, symbol {CURRENCY_SYMBOL.get(ccy, ccy)}) by converting "
            f"at that rate, and note that the plans are INR-denominated."
        )

    # Warn Gemini if budget is very low (user may have typed monthly thinking it converts)
    budget_note = ""
    min_premium = min(float(p["premium_amount"]) for p in plans)
    if request.budget_inr < min_premium:
        budget_note = (
            f"\nNOTE: Customer budget (≈Rs{request.budget_inr:,.0f}/year) is below the minimum plan premium "
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
- Annual Budget (max yearly premium): {_fmt(request.budget, ccy)}/year ({ccy})
- Medical History: {request.medical_history}{' — detected conditions: ' + ', '.join(conditions) if conditions else ''}
- City / Location: {request.city}

Available Plans (ALL premium amounts are ANNUAL, per year, in INR):
{plans_text}
{currency_note}{budget_note}

RAG Policy Clauses Retrieved (use to inform your recommendation):
{rag_context}

Decision Rules (apply in order):
1. MEMBER ELIGIBILITY: plan max_members must be >= family_size. Never recommend a plan that can't cover the family.
2. BUDGET FIT: annual premium must ideally fit the customer's budget (convert currencies as instructed). If it exceeds, explain why the higher plan is worth it.
3. MEDICAL HISTORY: explicitly reference the customer's stated conditions (e.g. asthma, hypertension) and prefer higher coverage (Rs10L+ equivalent) when present.
4. FAMILY TYPE:
   - family_size=1 → individual plans
   - family_size=2-4 → family plans
   - seniors/parents → senior/parent plans
   - family_size=5-8 → large-family plans
5. Personalise: mention the customer's city/location and conditions in the reasoning. Never output generic boilerplate.
6. CRITICAL: Keep your `reasoning` extremely concise and brief (under 2 sentences max). Do not generate long paragraphs.

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "recommended_plan_id": 2,
  "recommended_plan_name": "Family Medical Insurance",
  "reasoning": "<concise, personalised, figures in {ccy}>",
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

    resp = PolicyRecommendationResponse(
        recommended_plan_id=plan_id,
        recommended_plan_name=result.get("recommended_plan_name", fallback.recommended_plan_name),
        reasoning=result.get("reasoning", fallback.reasoning),
        confidence_score=float(result.get("confidence_score", 0.75)),
    )
    return _localise(resp, request, plans)

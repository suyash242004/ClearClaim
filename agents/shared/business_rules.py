"""
agents/shared/business_rules.py — Deterministic IRDAI rules engine.

Every claim is validated against these rules BEFORE any LLM call:
  - Permanent exclusions  → instant auto-reject with citation (no Gemini cost)
  - Waiting periods       → instant auto-reject with citation
  - Room-rent proportionate deduction, senior co-pay, cumulative bonus
    → adjust the payable amount exactly like a real Indian insurer (TPA) does.

This makes decisions defensible (every rejection cites a rule), cheap
(exclusions never reach the LLM), and quantitative (payable amount is
computed, not guessed by the model).

DB rule reminder: all table names are lowercase and unquoted.
"""
from datetime import date
from typing import Optional

# ── IRDAI-mandated waiting periods (days) ────────────────────────────────────
WAITING_PERIODS = {
    "pre_existing_disease": 1095,   # 36 months — IRDAI mandate (2024 revision)
    "maternity":            1095,   # 36 months typical
    "specific_ailments":    730,    # 24 months (hernia, cataract, piles, ENT…)
    "initial_waiting":      30,     # 30 days for all non-accident claims
    "accident":             0,      # covered from day 1
}

SPECIFIC_AILMENTS = [
    "cataract", "hernia", "piles", "hydrocele", "sinusitis",
    "tonsils", "gallstone", "kidney stone", "knee replacement",
    "fistula", "fissure", "varicose",
]

PERMANENT_EXCLUSIONS = [
    "cosmetic surgery", "rhinoplasty", "botox", "dental",
    "infertility", "ivf", "obesity treatment", "bariatric",
    "self-inflicted injury", "suicide attempt", "war injury",
    "experimental treatment", "unproven treatment",
]

# Dental IS covered when caused by an accident — real IRDAI carve-out.
ACCIDENT_KEYWORDS = ["accident", "trauma", "injury", "fracture", "rta", "road traffic"]

MATERNITY_KEYWORDS = ["maternity", "pregnancy", "delivery", "caesarean", "c-section", "childbirth"]

ROOM_RENT_CAP_PCT = 0.01   # 1% of sum insured per day (standard plan cap)
ICU_CAP_PCT       = 0.02   # 2% of sum insured per day
CO_PAY_SENIOR     = 0.20   # 20% co-pay if any insured member is over 60
CUMULATIVE_BONUS_PCT_PER_YEAR = 0.05   # +5% sum insured per claim-free year
CUMULATIVE_BONUS_MAX          = 0.50   # capped at +50%


def _is_accident(disease: str, description: str) -> bool:
    text = f"{disease} {description}".lower()
    return any(k in text for k in ACCIDENT_KEYWORDS)


def check_permanent_exclusions(disease: str, description: str = "") -> Optional[dict]:
    """Returns a violation dict if the claim hits a permanent exclusion, else None."""
    text = f"{disease} {description}".lower()
    for exclusion in PERMANENT_EXCLUSIONS:
        if exclusion.split(" (")[0] in text:
            # Dental accident carve-out
            if exclusion == "dental" and _is_accident(disease, description):
                continue
            return {
                "rule": "PERMANENT_EXCLUSION",
                "citation": f"IRDAI Standard Exclusion List — '{exclusion}' is permanently excluded from coverage.",
                "detail": f"Claimed condition '{disease}' matches permanent exclusion '{exclusion}'.",
                "severity": "auto_reject",
            }
    return None


def check_waiting_periods(disease: str, description: str,
                          days_on_policy: int, historical_disease: str) -> Optional[dict]:
    """Returns a violation dict if a waiting period bars this claim, else None."""
    text = f"{disease} {description}".lower()
    history = (historical_disease or "").strip().lower()

    # Accidents are covered from day 1 — no waiting period applies.
    if _is_accident(disease, description):
        return None

    # 1. Initial 30-day waiting period (all non-accident claims)
    if days_on_policy < WAITING_PERIODS["initial_waiting"]:
        return {
            "rule": "INITIAL_WAITING_PERIOD",
            "citation": "Clause 5.1 — 30-day initial waiting period applies to all non-accidental claims.",
            "detail": f"Claim filed {days_on_policy} days after policy start (minimum 30 required).",
            "severity": "auto_reject",
        }

    # 2. Pre-existing disease: 36-month waiting period
    if history not in ("", "no", "none") and history in text \
            and days_on_policy < WAITING_PERIODS["pre_existing_disease"]:
        return {
            "rule": "PRE_EXISTING_WAITING_PERIOD",
            "citation": "IRDAI mandate — pre-existing diseases carry a 36-month waiting period.",
            "detail": (f"'{disease}' matches declared pre-existing condition "
                       f"'{historical_disease}' at {days_on_policy} days on policy "
                       f"({WAITING_PERIODS['pre_existing_disease']} required)."),
            "severity": "auto_reject",
        }

    # 3. Specific ailments: 24-month waiting period
    for ailment in SPECIFIC_AILMENTS:
        if ailment in text and days_on_policy < WAITING_PERIODS["specific_ailments"]:
            return {
                "rule": "SPECIFIC_AILMENT_WAITING_PERIOD",
                "citation": f"Clause 4.x — '{ailment}' carries a 24-month waiting period.",
                "detail": f"'{disease}' at {days_on_policy} days on policy (730 required).",
                "severity": "auto_reject",
            }

    # 4. Maternity: 36-month waiting period
    if any(k in text for k in MATERNITY_KEYWORDS) \
            and days_on_policy < WAITING_PERIODS["maternity"]:
        return {
            "rule": "MATERNITY_WAITING_PERIOD",
            "citation": "Clause 10.1 — maternity is covered only after the waiting period from policy inception.",
            "detail": f"Maternity claim at {days_on_policy} days on policy (1095 required).",
            "severity": "auto_reject",
        }

    return None


def proportionate_deduction(claim_amount: float, room_rent_per_day: float,
                            stay_days: int, sum_insured: float,
                            is_icu: bool = False) -> dict:
    """
    Room-rent proportionate deduction — how real insurers reduce a bill.
    If the room rent exceeds the eligible cap, ALL associated charges are
    reduced in the same ratio (eligible_rent / actual_rent).
    """
    cap_pct = ICU_CAP_PCT if is_icu else ROOM_RENT_CAP_PCT
    eligible_rent = sum_insured * cap_pct
    if room_rent_per_day <= 0 or room_rent_per_day <= eligible_rent:
        return {"applied": False, "payable": claim_amount, "deduction": 0.0,
                "ratio": 1.0, "eligible_rent_per_day": eligible_rent}
    ratio = eligible_rent / room_rent_per_day
    payable = round(claim_amount * ratio, 2)
    return {
        "applied": True,
        "payable": payable,
        "deduction": round(claim_amount - payable, 2),
        "ratio": round(ratio, 4),
        "eligible_rent_per_day": eligible_rent,
        "citation": (f"Clause 8.5 — room rent capped at {cap_pct*100:.0f}% of sum insured/day "
                     f"(₹{eligible_rent:,.0f}). Actual ₹{room_rent_per_day:,.0f}/day → all charges "
                     f"reduced proportionally to {ratio*100:.1f}%."),
    }


def cumulative_bonus(sum_insured: float, claim_free_years: int) -> dict:
    """+5% sum insured per claim-free year, capped at +50%."""
    bonus_pct = min(claim_free_years * CUMULATIVE_BONUS_PCT_PER_YEAR, CUMULATIVE_BONUS_MAX)
    return {
        "bonus_pct": bonus_pct,
        "bonus_amount": round(sum_insured * bonus_pct, 2),
        "effective_sum_insured": round(sum_insured * (1 + bonus_pct), 2),
    }


def validate_claim(claim: dict, policy: dict, customer: dict,
                   prev_approved_total: float, max_insured_age: int = None) -> dict:
    """
    Full deterministic validation. Returns:
      auto_reject        — True → the claim never reaches the LLM
      reject_rule        — machine-readable rule id
      reject_citation    — human-readable clause the customer sees
      payable_amount     — claim amount after co-pay / bonus / coverage math
      adjustments        — every deduction, itemised with citations
      notes              — extra context to inject into the LLM prompt
    """
    disease     = (claim.get("disease") or "").strip()
    description = (claim.get("description") or "").strip()
    claim_amount = float(claim.get("claim_amount") or 0)
    sum_insured  = float(policy.get("coverage_amount") or 0)
    renewal_count = int(policy.get("renewal_count") or 0)

    # Days on policy
    try:
        start = policy.get("start_date")
        if isinstance(start, str):
            start = date.fromisoformat(str(start)[:10])
        days_on_policy = (date.today() - start).days if isinstance(start, date) else 999
    except Exception:
        days_on_policy = 999

    adjustments = []
    notes = []

    # ── Gate 1: permanent exclusions (auto-reject, zero LLM cost) ────────────
    violation = check_permanent_exclusions(disease, description)
    if violation:
        return {"auto_reject": True, "reject_rule": violation["rule"],
                "reject_citation": violation["citation"], "detail": violation["detail"],
                "payable_amount": 0.0, "adjustments": [], "days_on_policy": days_on_policy,
                "notes": [violation["detail"]]}

    # ── Gate 2: waiting periods (auto-reject with citation) ─────────────────
    violation = check_waiting_periods(disease, description, days_on_policy,
                                      customer.get("historical_disease") or "")
    if violation:
        return {"auto_reject": True, "reject_rule": violation["rule"],
                "reject_citation": violation["citation"], "detail": violation["detail"],
                "payable_amount": 0.0, "adjustments": [], "days_on_policy": days_on_policy,
                "notes": [violation["detail"]]}

    # ── Cumulative bonus raises the effective sum insured ────────────────────
    bonus = cumulative_bonus(sum_insured, renewal_count)
    effective_si = bonus["effective_sum_insured"]
    if bonus["bonus_pct"] > 0:
        adjustments.append({
            "type": "cumulative_bonus",
            "amount": bonus["bonus_amount"],
            "citation": (f"Cumulative bonus: +{bonus['bonus_pct']*100:.0f}% for "
                         f"{renewal_count} claim-free renewal(s) → effective sum insured "
                         f"₹{effective_si:,.0f}."),
        })

    # ── Coverage exhaustion (hard financial cap) ─────────────────────────────
    remaining = effective_si - prev_approved_total
    if remaining <= 0:
        return {"auto_reject": True, "reject_rule": "COVERAGE_EXHAUSTED",
                "reject_citation": "Sum insured fully exhausted by previously approved claims.",
                "detail": f"Effective sum insured ₹{effective_si:,.0f} already paid out.",
                "payable_amount": 0.0, "adjustments": adjustments,
                "days_on_policy": days_on_policy, "notes": []}

    payable = min(claim_amount, remaining)
    if payable < claim_amount:
        adjustments.append({
            "type": "coverage_cap",
            "amount": -(claim_amount - payable),
            "citation": (f"Claim capped at remaining coverage ₹{remaining:,.0f} "
                         f"(₹{prev_approved_total:,.0f} already utilised)."),
        })

    # ── Senior co-pay: 20% if any insured member is over 60 ─────────────────
    oldest = max(int(customer.get("age") or 0), int(max_insured_age or 0))
    if oldest > 60:
        copay = round(payable * CO_PAY_SENIOR, 2)
        payable = round(payable - copay, 2)
        adjustments.append({
            "type": "senior_co_pay",
            "amount": -copay,
            "citation": (f"20% co-pay applies — oldest insured member is {oldest} "
                         f"(>60). Customer bears ₹{copay:,.0f}."),
        })

    notes.append(f"Deterministic payable amount after policy math: ₹{payable:,.0f} "
                 f"of claimed ₹{claim_amount:,.0f}.")

    return {
        "auto_reject": False,
        "reject_rule": None,
        "reject_citation": None,
        "detail": None,
        "payable_amount": payable,
        "effective_sum_insured": effective_si,
        "remaining_coverage": remaining,
        "days_on_policy": days_on_policy,
        "adjustments": adjustments,
        "notes": notes,
    }

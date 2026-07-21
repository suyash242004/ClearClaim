"""
agents/orchestrator/adjudicate_payload.py — stateless claim adjudication for
external buyers who have no claim_id in our DB (graph_adjudicate Mode B).

Reuses, UNCHANGED:
  - shared.business_rules.validate_claim   (IRDAI rules gate)
  - fraud_detector.router.score_fraud_core (fraud scoring rules)
  - shared.prompts.CLAIM_PROCESSOR_SYSTEM_PROMPT
  - shared.gemini_client.generate_json_response (already has the 25s hard
    deadline + rules-based-on-failure fallback from the round-5 x402 fix)

This module never touches the DB, never writes to X Layer, and never calls
the .NET WriteAPI — it computes a decision from the submitted payload and
returns it. The existing claim_id path (orchestrator.graph via LangGraph +
SqliteSaver checkpointing) is completely untouched; this is an additive,
parallel code path for buyers with no claim_id to give us.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from datetime import date, timedelta
from typing import List

from shared.business_rules import validate_claim
from shared.gemini_client import generate_json_response
from shared.prompts import CLAIM_PROCESSOR_SYSTEM_PROMPT

logger = logging.getLogger("clearclaim.adjudicate_payload")

# Same thresholds graph.py uses — mirrored here, not imported, because graph.py
# also carries LangGraph/SqliteSaver wiring we deliberately don't touch.
FRAUD_AUTO_REJECT = 85
CONFIDENCE_FLOOR  = 0.70
HIGH_VALUE_INR    = 500_000

REQUIRED_ADJUDICATE_PAYLOAD_FIELDS = ("disease", "claim_amount", "coverage_amount")


def _audit(trail: List[str], msg: str) -> List[str]:
    return trail + [msg]


def adjudicate_claim_from_payload(params: dict) -> dict:
    """
    Stateless equivalent of the graph_adjudicate pipeline (rules_gate →
    fraud_check → ai_adjudicate), driven entirely by the submitted payload.
    Never reads or writes the DB, never writes onchain.

    Required: disease, claim_amount, coverage_amount — the IRDAI rules engine
    and fraud scoring cannot produce a non-misleading result without them.
    Optional (safe defaults): previously_approved_total=0,
    days_since_policy_start=999, historical_disease="No", prior_claim_count=0,
    hospital_in_network=True, doctor_name, description, customer_age,
    customer_gender.
    """
    missing = [f for f in REQUIRED_ADJUDICATE_PAYLOAD_FIELDS if params.get(f) in (None, "")]
    if missing:
        raise ValueError(f"Missing required field(s): {', '.join(missing)}")

    from fraud_detector.router import score_fraud_core, risk_level_for  # local import: avoid import cycle at module load

    disease              = str(params["disease"])
    description          = str(params.get("description", "") or "")
    claim_amount         = float(params["claim_amount"])
    coverage_amount      = float(params["coverage_amount"])
    prev_approved_total  = float(params.get("previously_approved_total", 0) or 0)
    days_since_start     = int(params.get("days_since_policy_start", 999) or 999)
    historical_disease   = str(params.get("historical_disease", "No") or "No")
    prior_claims         = int(params.get("prior_claim_count", 0) or 0)
    hospital_in_network  = bool(params.get("hospital_in_network", True))
    customer_age         = params.get("customer_age")
    customer_gender      = str(params.get("customer_gender", "Unknown") or "Unknown")

    audit_trail: List[str] = [
        f"PAYLOAD MODE — external submission, no claim_id. disease='{disease}' "
        f"amount=Rs{claim_amount:,.0f} coverage=Rs{coverage_amount:,.0f}"
    ]

    # ── Rules gate (business_rules.validate_claim, UNCHANGED) ────────────────
    # validate_claim reads days-on-policy from policy["start_date"]; we
    # synthesize a start_date that reproduces the caller's stated
    # days_since_policy_start exactly, so the untouched IRDAI logic applies
    # identically to payload-mode inputs.
    synthetic_start = (date.today() - timedelta(days=days_since_start)).isoformat()
    claim   = {"disease": disease, "description": description, "claim_amount": claim_amount}
    policy  = {"coverage_amount": coverage_amount, "start_date": synthetic_start, "renewal_count": 0}
    customer = {"historical_disease": historical_disease, "age": customer_age or 0}

    rules_result = validate_claim(claim, policy, customer, prev_approved_total)
    audit_trail = _audit(audit_trail,
        f"RULES GATE — {'AUTO-REJECT: ' + rules_result['reject_citation'] if rules_result['auto_reject'] else 'passed, payable Rs' + format(rules_result['payable_amount'], ',.0f')}")

    if rules_result["auto_reject"]:
        return {
            "ai_decision": "Reject",
            "ai_reasoning": f"Auto-rejected by IRDAI rules engine — {rules_result['reject_citation']} {rules_result['detail']}",
            "confidence": 0.99,
            "payable_amount": 0.0,
            "fraud_score": None,
            "fraud_indicators": [],
            "requires_human_review": False,
            "tx_hash": None,
            "audit_trail": audit_trail,
            "mode": "payload",
        }

    payable_amount     = rules_result["payable_amount"]
    remaining_coverage = rules_result.get("remaining_coverage", coverage_amount - prev_approved_total)
    days_on_policy      = rules_result.get("days_on_policy", days_since_start)

    # ── Fraud scoring (fraud_detector.score_fraud_core, UNCHANGED) ───────────
    fraud_score, fraud_indicators = score_fraud_core(
        disease=disease, claim_amount=claim_amount, coverage_amount=coverage_amount,
        historical_disease=historical_disease.strip().lower(),
        remaining_coverage=remaining_coverage, days_on_policy=days_on_policy,
        prior_claims=prior_claims,
    )
    audit_trail = _audit(audit_trail,
        f"FRAUD CHECK — score {fraud_score}/100 ({risk_level_for(fraud_score)}). "
        f"Indicators: {'; '.join(fraud_indicators) or 'none'}")

    if fraud_score >= FRAUD_AUTO_REJECT:
        audit_trail = _audit(audit_trail, f"FAST REJECT — fraud {fraud_score} >= {FRAUD_AUTO_REJECT}; Gemini skipped")
        return {
            "ai_decision": "Reject",
            "ai_reasoning": (f"Auto-rejected: fraud score {fraud_score}/100 exceeds threshold "
                             f"{FRAUD_AUTO_REJECT}. Indicators: {'; '.join(fraud_indicators)}"),
            "confidence": 0.95,
            "payable_amount": payable_amount,
            "fraud_score": fraud_score,
            "fraud_indicators": fraud_indicators,
            "requires_human_review": False,
            "tx_hash": None,
            "audit_trail": audit_trail,
            "mode": "payload",
        }

    # ── Gemini adjudication (shared prompt + client, UNCHANGED) ──────────────
    rag_context = "(policy clause retrieval unavailable in payload mode)"
    try:
        from shared.rag import semantic_search
        clauses = semantic_search(f"{disease} {description}", top_k=2)
        rag_context = "\n".join(f"- {c}" for c in clauses)
    except Exception as e:
        logger.warning(f"[AdjudicatePayload] RAG unavailable: {e}")

    prompt = CLAIM_PROCESSOR_SYSTEM_PROMPT.format(
        customer_name="External submission (no customer record)",
        customer_age=customer_age if customer_age is not None else "Unknown",
        customer_gender=customer_gender,
        historical_disease=historical_disease,
        days_since_start=days_on_policy,
        coverage_amount=coverage_amount,
        prev_approved_total=prev_approved_total,
        remaining_coverage=remaining_coverage,
        claim_id="external (payload mode)",
        disease=disease,
        claim_amount=claim_amount,
        description=description,
        hospital_valid="YES" if hospital_in_network else "NO",
        rag_context=rag_context,
    )
    prompt += (f"\n\n[RULES ENGINE — already computed deterministically]\n"
              f"Fraud score: {fraud_score}/100 ({'; '.join(fraud_indicators) or 'no indicators'})\n"
              f"Deterministic payable amount: Rs{payable_amount:,.0f} "
              f"(after co-pay/bonus/coverage math — cite this in your reasoning)")

    ai = generate_json_response(prompt)  # sync; hard 25s deadline is baked in
    decision   = ai.get("decision", "Flag")
    reasoning  = ai.get("reasoning", "No reasoning returned.")
    confidence = float(ai.get("confidence_score", 0.0))
    ai_indicators = ai.get("fraud_indicators", [])

    if decision == "Flag" and confidence == 0.0:
        # Gemini quota/timeout fallback fired — degrade to rules, never hang/crash.
        if fraud_score < 30 and hospital_in_network and payable_amount > 0:
            decision = "Approve"
            reasoning = (f"Rule-based fallback (LLM unavailable): fraud score {fraud_score}/100 (low), "
                        f"network hospital, within coverage. Payable Rs{payable_amount:,.0f} "
                        f"per IRDAI policy math.")
            confidence = 0.60
        else:
            reasoning = (f"LLM unavailable and fraud score {fraud_score}/100 — "
                        f"flagged for mandatory human review.")
        audit_trail = _audit(audit_trail, "AI ADJUDICATE — Gemini fallback engaged")

    audit_trail = _audit(audit_trail,
        f"AI ADJUDICATE — {decision} (confidence {confidence:.0%}): {reasoning[:180]}")

    requires_human_review = (
        confidence < CONFIDENCE_FLOOR
        or fraud_score >= FRAUD_AUTO_REJECT
        or claim_amount > HIGH_VALUE_INR
        or decision == "Flag"
    )
    if requires_human_review:
        audit_trail = _audit(audit_trail,
            "ADVISORY — this claim would be routed to human review in our DB-backed "
            "pipeline; payload mode is stateless and has no review queue to pause in, "
            "so the AI decision is returned with requires_human_review=true.")

    return {
        "ai_decision": decision,
        "ai_reasoning": reasoning,
        "confidence": confidence,
        "payable_amount": payable_amount,
        "fraud_score": fraud_score,
        "fraud_indicators": list(dict.fromkeys(fraud_indicators + ai_indicators)),
        "requires_human_review": requires_human_review,
        "tx_hash": None,
        "audit_trail": audit_trail,
        "mode": "payload",
    }

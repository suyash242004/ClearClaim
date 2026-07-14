"""
agents/orchestrator/graph.py — LangGraph claim-adjudication workflow.

Production upgrade over the raw-httpx orchestrator:
  - Stateful graph with SQLite checkpointing (agents/checkpoints.db):
    a crash mid-claim resumes at the exact node it stopped on.
  - Deterministic IRDAI rules gate BEFORE any LLM call (cheap + defensible).
  - Human-in-the-loop interrupt: low-confidence / high-fraud / high-value
    claims pause the graph until an admin approves via the Review Queue.
  - Full audit trail: every state transition is recorded for compliance.

Graph topology:
    fetch_claim → rules_gate ─(exclusion/waiting period)→ persist_decision
                     │
                 fraud_check ─(score ≥ 85)→ persist_decision (auto-reject)
                     ├─(50 ≤ score < 85)→ clinical_review → ai_adjudicate
                     └─(score < 50)→ ai_adjudicate
    ai_adjudicate ─(confidence < 0.70 | fraud ≥ 85 | amount > ₹5,00,000)→ human_checkpoint
                  └─(else)→ record_onchain → persist_decision → END
    human_checkpoint (INTERRUPT — admin resumes) → record_onchain → …

DB rule: all table names lowercase and unquoted.
"""
import os
import sys
import sqlite3
import logging
from datetime import datetime
from typing import TypedDict, Optional, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver

from shared import metrics
from shared.db import (
    get_claim_details, get_policy_details, get_customer_history,
    get_previous_claims_total, check_hospital_validity, write_ai_decision,
)
from shared.business_rules import validate_claim
from shared.gemini_client import generate_json_response
from shared.prompts import CLAIM_PROCESSOR_SYSTEM_PROMPT

logger = logging.getLogger("clearclaim.graph")

WRITE_API = os.getenv("WRITE_API", "http://localhost:5130")

# Human-in-the-loop thresholds
CONFIDENCE_FLOOR   = 0.70
FRAUD_AUTO_REJECT  = 85
FRAUD_CLINICAL_MIN = 50
HIGH_VALUE_INR     = 500_000


# ── State ─────────────────────────────────────────────────────────────────────
class ClaimState(TypedDict):
    claim_id: int
    policy_id: Optional[int]
    customer_id: Optional[int]
    claim_amount: Optional[float]
    fraud_score: Optional[int]
    fraud_indicators: List[str]
    clinical_review: Optional[dict]
    rules_result: Optional[dict]        # deterministic IRDAI engine output
    payable_amount: Optional[float]
    ai_decision: Optional[str]
    ai_reasoning: Optional[str]
    confidence: Optional[float]
    tx_hash: Optional[str]
    requires_human: bool
    human_decision: Optional[str]       # set by /agent/graph/resume
    audit_trail: List[str]              # every transition, for compliance replay
    retry_count: int
    error: Optional[str]


def _audit(state: ClaimState, msg: str) -> List[str]:
    entry = f"[{datetime.now().isoformat(timespec='seconds')}] {msg}"
    logger.info(f"[Graph claim={state.get('claim_id')}] {msg}")
    return state.get("audit_trail", []) + [entry]


# ── Nodes ─────────────────────────────────────────────────────────────────────

def fetch_claim(state: ClaimState) -> dict:
    claim_id = state["claim_id"]
    claim = get_claim_details(claim_id)
    if not claim:
        return {"error": f"Claim {claim_id} not found",
                "audit_trail": _audit(state, f"FETCH failed — claim {claim_id} not found in DB")}
    policy = get_policy_details(claim["policy_id"])
    if not policy:
        return {"error": f"Policy {claim['policy_id']} not found",
                "audit_trail": _audit(state, f"FETCH failed — policy {claim['policy_id']} missing")}
    customer = get_customer_history(policy["customer_id"])
    return {
        "policy_id": claim["policy_id"],
        "customer_id": policy["customer_id"],
        "claim_amount": float(claim.get("claim_amount") or 0),
        "audit_trail": _audit(state,
            f"FETCH ok — claim ₹{float(claim.get('claim_amount') or 0):,.0f} "
            f"'{claim.get('disease')}' | customer #{policy['customer_id']} "
            f"({customer.get('customer_name', '?')}, age {customer.get('age', '?')})"),
    }


def rules_gate(state: ClaimState) -> dict:
    """Deterministic IRDAI validation — runs BEFORE fraud scoring and the LLM."""
    claim    = get_claim_details(state["claim_id"])
    policy   = get_policy_details(state["policy_id"])
    customer = get_customer_history(state["customer_id"])
    prev     = get_previous_claims_total(state["policy_id"])

    result = validate_claim(claim, policy, customer, prev)

    if result["auto_reject"]:
        metrics.incr("auto_rejects_rule_engine")
        reasoning = (f"Auto-rejected by IRDAI rules engine — {result['reject_citation']} "
                     f"{result['detail']}")
        return {
            "rules_result": result,
            "payable_amount": 0.0,
            "ai_decision": "Reject",
            "ai_reasoning": reasoning,
            "confidence": 0.99,
            "requires_human": False,
            "audit_trail": _audit(state,
                f"RULES GATE — AUTO-REJECT [{result['reject_rule']}]: {result['reject_citation']}"),
        }

    adjustment_notes = "; ".join(a["citation"] for a in result["adjustments"]) or "none"
    return {
        "rules_result": result,
        "payable_amount": result["payable_amount"],
        "audit_trail": _audit(state,
            f"RULES GATE — passed. Payable ₹{result['payable_amount']:,.0f} "
            f"(adjustments: {adjustment_notes})"),
    }


def fraud_check(state: ClaimState) -> dict:
    """Calls the fraud detector's scoring function directly — no HTTP hop."""
    try:
        from fraud_detector.router import calculate_fraud_score
        res = calculate_fraud_score(state["claim_id"])
        return {
            "fraud_score": res.score,
            "fraud_indicators": res.indicators,
            "audit_trail": _audit(state,
                f"FRAUD CHECK — score {res.score}/100 ({res.risk_level}). "
                f"Indicators: {'; '.join(res.indicators) or 'none'}"),
        }
    except Exception as e:
        return {
            "fraud_score": 0,
            "fraud_indicators": [],
            "audit_trail": _audit(state, f"FRAUD CHECK failed ({e}) — continuing with score 0"),
        }


def clinical_review(state: ClaimState) -> dict:
    """Second-opinion clinical cross-verification for mid-band fraud scores."""
    try:
        from hospital_assistant.router import get_clinical_review
        res = get_clinical_review(state["claim_id"])
        review = res.model_dump() if hasattr(res, "model_dump") else dict(res)
        summary = (f"ICD {review.get('icd_code')} ({review.get('icd_description')}); "
                   f"approval probability {review.get('approval_probability')}; "
                   f"red flags: {', '.join(review.get('red_flags', [])) or 'none'}")
        return {
            "clinical_review": review,
            "audit_trail": _audit(state, f"CLINICAL REVIEW — {summary}"),
        }
    except Exception as e:
        return {
            "clinical_review": None,
            "audit_trail": _audit(state, f"CLINICAL REVIEW failed ({e}) — proceeding without it"),
        }


def ai_adjudicate(state: ClaimState) -> dict:
    """Gemini adjudication with RAG clauses + rules-engine math injected."""
    claim    = get_claim_details(state["claim_id"])
    policy   = get_policy_details(state["policy_id"])
    customer = get_customer_history(state["customer_id"])
    prev     = get_previous_claims_total(state["policy_id"])
    hospital_valid = check_hospital_validity(state["policy_id"], claim["hospital_id"])
    coverage = float(policy.get("coverage_amount") or 0)
    rules    = state.get("rules_result") or {}

    # RAG clause retrieval — best-effort (embedding quota may be exhausted)
    rag_context = "No clauses retrieved (RAG unavailable)."
    try:
        from shared.rag import semantic_search
        clauses = semantic_search(f"{claim.get('disease')} {claim.get('description') or ''}", top_k=2)
        rag_context = "\n".join(f"- {c}" for c in clauses)
    except Exception as e:
        logger.warning(f"[Graph] RAG unavailable: {e}")

    prompt = CLAIM_PROCESSOR_SYSTEM_PROMPT.format(
        customer_name=customer.get("customer_name", "Unknown"),
        customer_age=customer.get("age", "Unknown"),
        customer_gender=customer.get("gender", "Unknown"),
        historical_disease=customer.get("historical_disease", "No"),
        days_since_start=rules.get("days_on_policy", "Unknown"),
        coverage_amount=coverage,
        prev_approved_total=prev,
        remaining_coverage=rules.get("remaining_coverage", coverage - prev),
        claim_id=state["claim_id"],
        disease=claim.get("disease", "Unknown"),
        claim_amount=claim.get("claim_amount", 0),
        description=claim.get("description", ""),
        hospital_valid="YES" if hospital_valid else "NO",
        rag_context=rag_context,
    )

    prompt += (f"\n\n[RULES ENGINE — already computed deterministically]\n"
               f"Fraud score: {state.get('fraud_score')}/100 "
               f"({'; '.join(state.get('fraud_indicators', [])) or 'no indicators'})\n"
               f"Deterministic payable amount: Rs{state.get('payable_amount', 0):,.0f} "
               f"(after co-pay/bonus/coverage math — cite this in your reasoning)")
    if state.get("clinical_review"):
        cr = state["clinical_review"]
        prompt += (f"\n[CLINICAL CROSS-VERIFICATION] ICD {cr.get('icd_code')} — "
                   f"{cr.get('clinical_notes', '')} Red flags: "
                   f"{', '.join(cr.get('red_flags', [])) or 'none'}")

    metrics.incr("llm_calls")
    metrics.incr("llm_tokens_estimated", len(prompt) // 4)
    ai = generate_json_response(prompt)

    decision   = ai.get("decision", "Flag")
    reasoning  = ai.get("reasoning", "No reasoning returned.")
    confidence = float(ai.get("confidence_score", 0.0))

    if decision == "Flag" and confidence == 0.0:
        # Gemini quota/auth fallback fired — degrade to the rules engine, never crash
        metrics.incr("llm_fallbacks")
        fraud = state.get("fraud_score") or 0
        if fraud < 30 and hospital_valid and (state.get("payable_amount") or 0) > 0:
            decision = "Approve"
            reasoning = (f"Rule-based fallback (LLM unavailable): fraud score {fraud}/100 (low), "
                         f"network hospital, within coverage. Payable "
                         f"₹{state.get('payable_amount', 0):,.0f} per IRDAI policy math.")
            confidence = 0.60   # below the floor → routed to human checkpoint
        else:
            reasoning = (f"LLM unavailable and fraud score {fraud}/100 — "
                         f"flagged for mandatory human review.")

    return {
        "ai_decision": decision,
        "ai_reasoning": reasoning,
        "confidence": confidence,
        "audit_trail": _audit(state,
            f"AI ADJUDICATE — {decision} (confidence {confidence:.0%}): {reasoning[:180]}"),
    }


def human_checkpoint(state: ClaimState) -> dict:
    """
    Runs only AFTER an admin resumes the graph (compiled with
    interrupt_before=['human_checkpoint'], so the graph pauses first).
    The admin's decision arrives via update_state from /agent/graph/resume.
    """
    human = state.get("human_decision")
    if human in ("Approve", "Reject"):
        return {
            "ai_decision": human,
            "confidence": 1.0,
            "requires_human": False,
            "ai_reasoning": (state.get("ai_reasoning") or "") +
                            f" [Overridden/confirmed by human admin: {human}]",
            "audit_trail": _audit(state, f"HUMAN CHECKPOINT — admin decided: {human}"),
        }
    return {"requires_human": False,
            "audit_trail": _audit(state, "HUMAN CHECKPOINT — resumed without override; "
                                         "keeping AI decision")}


def record_onchain(state: ClaimState) -> dict:
    """Best-effort X Layer write — a failed TX never blocks the decision."""
    try:
        from shared.blockchain import record_claim_decision
        conf_pct = int((state.get("confidence") or 0) * 100)
        tx = record_claim_decision(
            state["claim_id"], state.get("ai_decision") or "Flag",
            state.get("ai_reasoning") or "", conf_pct,
        )
        if tx:
            metrics.incr("blockchain_tx_written")
            return {"tx_hash": tx,
                    "audit_trail": _audit(state,
                        f"ONCHAIN — recorded on X Layer: {tx[:20]}… "
                        f"(https://www.oklink.com/xlayer-test/tx/{tx})")}
        metrics.incr("blockchain_tx_failed")
        return {"audit_trail": _audit(state, "ONCHAIN — skipped (wallet/RPC unavailable)")}
    except Exception as e:
        metrics.incr("blockchain_tx_failed")
        return {"audit_trail": _audit(state, f"ONCHAIN — failed ({e}); decision unaffected")}


def persist_decision(state: ClaimState) -> dict:
    """Writes the final decision to Postgres + the .NET WriteAPI."""
    decision = state.get("ai_decision") or "Flag"
    try:
        write_ai_decision(state["claim_id"], decision,
                          state.get("ai_reasoning") or "",
                          state.get("confidence") or 0.0,
                          state.get("tx_hash"))
    except Exception as e:
        return {"error": str(e),
                "audit_trail": _audit(state, f"PERSIST failed: {e}")}

    # Status update via WriteAPI (Flag → stays Pending for the admin queue)
    api_note = "status left Pending (Flag)"
    if decision in ("Approve", "Reject"):
        endpoint = "approve" if decision == "Approve" else "reject"
        new_status = "Approved" if decision == "Approve" else "Rejected"
        try:
            import httpx
            with httpx.Client(timeout=15.0) as client:
                res = client.put(f"{WRITE_API}/api/admin/claims/{endpoint}/{state['claim_id']}")
                res.raise_for_status()
            api_note = f"WriteAPI status → {new_status}"
        except Exception as e:
            # WriteAPI down must never leave a decided claim stuck in Pending —
            # degrade to a direct status write so DB state matches the decision.
            try:
                from shared.db import get_db_connection
                conn = get_db_connection()
                try:
                    with conn.cursor() as cur:
                        cur.execute("UPDATE claims SET status = %s WHERE claim_id = %s",
                                    (new_status, state["claim_id"]))
                    conn.commit()
                finally:
                    conn.close()
                api_note = f"WriteAPI unreachable — status → {new_status} written directly to DB"
            except Exception as e2:
                api_note = f"WriteAPI unreachable ({e}) AND direct DB status write failed ({e2})"

    metrics.incr("claims_processed")
    return {"audit_trail": _audit(state,
        f"PERSIST — decision '{decision}' saved (confidence "
        f"{(state.get('confidence') or 0):.0%}); {api_note}")}


# ── Conditional edges ─────────────────────────────────────────────────────────

def route_after_fetch(state: ClaimState) -> str:
    return "persist_decision" if state.get("error") else "rules_gate"


def route_after_rules(state: ClaimState) -> str:
    # Rules-engine auto-reject skips fraud + LLM entirely
    if state.get("ai_decision") == "Reject":
        return "record_onchain"
    return "fraud_check"


def route_after_fraud(state: ClaimState) -> str:
    score = state.get("fraud_score") or 0
    if score >= FRAUD_AUTO_REJECT:
        return "auto_reject"
    if score >= FRAUD_CLINICAL_MIN:
        return "clinical_review"
    return "ai_adjudicate"


def fraud_auto_reject(state: ClaimState) -> dict:
    score = state.get("fraud_score") or 0
    return {
        "ai_decision": "Reject",
        "ai_reasoning": (f"Auto-rejected: fraud score {score}/100 exceeds threshold "
                         f"{FRAUD_AUTO_REJECT}. Indicators: "
                         f"{'; '.join(state.get('fraud_indicators', []))}"),
        "confidence": 0.95,
        "audit_trail": _audit(state,
            f"FAST REJECT — fraud {score} ≥ {FRAUD_AUTO_REJECT}; Gemini skipped (quota saved)"),
    }


def route_after_adjudicate(state: ClaimState) -> str:
    needs_human = (
        (state.get("confidence") or 0) < CONFIDENCE_FLOOR
        or (state.get("fraud_score") or 0) >= FRAUD_AUTO_REJECT
        or (state.get("claim_amount") or 0) > HIGH_VALUE_INR
        or state.get("ai_decision") == "Flag"
    )
    if needs_human:
        metrics.incr("graph_human_pauses")
        return "human_checkpoint"
    return "record_onchain"


# ── Graph assembly ────────────────────────────────────────────────────────────

def build_graph():
    g = StateGraph(ClaimState)
    g.add_node("fetch_claim", fetch_claim)
    g.add_node("rules_gate", rules_gate)
    g.add_node("fraud_check", fraud_check)
    g.add_node("auto_reject", fraud_auto_reject)
    g.add_node("clinical_review", clinical_review)
    g.add_node("ai_adjudicate", ai_adjudicate)
    g.add_node("human_checkpoint", human_checkpoint)
    g.add_node("record_onchain", record_onchain)
    g.add_node("persist_decision", persist_decision)

    g.set_entry_point("fetch_claim")
    g.add_conditional_edges("fetch_claim", route_after_fetch,
                            ["rules_gate", "persist_decision"])
    g.add_conditional_edges("rules_gate", route_after_rules,
                            ["fraud_check", "record_onchain"])
    g.add_conditional_edges("fraud_check", route_after_fraud,
                            ["auto_reject", "clinical_review", "ai_adjudicate"])
    g.add_edge("auto_reject", "record_onchain")
    g.add_edge("clinical_review", "ai_adjudicate")
    g.add_conditional_edges("ai_adjudicate", route_after_adjudicate,
                            ["human_checkpoint", "record_onchain"])
    g.add_edge("human_checkpoint", "record_onchain")
    g.add_edge("record_onchain", "persist_decision")
    g.add_edge("persist_decision", END)
    return g


_CHECKPOINT_DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                              "checkpoints.db")
_conn = sqlite3.connect(_CHECKPOINT_DB, check_same_thread=False)
checkpointer = SqliteSaver(_conn)

# Pause BEFORE human_checkpoint executes — the admin resumes via the Review Queue
claim_graph = build_graph().compile(
    checkpointer=checkpointer,
    interrupt_before=["human_checkpoint"],
)


def initial_state(claim_id: int) -> ClaimState:
    return {
        "claim_id": claim_id, "policy_id": None, "customer_id": None,
        "claim_amount": None, "fraud_score": None, "fraud_indicators": [],
        "clinical_review": None, "rules_result": None, "payable_amount": None,
        "ai_decision": None, "ai_reasoning": None, "confidence": None,
        "tx_hash": None, "requires_human": False, "human_decision": None,
        "audit_trail": [], "retry_count": 0, "error": None,
    }

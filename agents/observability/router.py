"""
agents/observability/router.py — live metrics + decision-trace replay.

  GET /agent/metrics             — in-process counters for the Admin dashboard strip
  GET /agent/traces/{claim_id}   — full decision trace (auditor / judge replay)

LangSmith tracing: if LANGCHAIN_TRACING_V2=true and LANGCHAIN_API_KEY are set
in agents/.env, every LangGraph node execution traces automatically — no code
changes needed here.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException

from shared import metrics
from shared.db import get_claim_details

router = APIRouter()


@router.get("/agent/metrics")
def get_metrics():
    snap = metrics.snapshot()
    snap["langsmith_tracing"] = os.getenv("LANGCHAIN_TRACING_V2", "").lower() == "true"
    return snap


@router.get("/agent/traces/{claim_id}")
def get_trace(claim_id: int):
    """
    Full decision replay for one claim — the compliance 'flight recorder'.
    Primary source: LangGraph checkpoint history. Fallback: the AI columns
    persisted on the claim row (covers claims decided by the legacy pipeline).
    """
    claim = get_claim_details(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found")

    trace = {
        "claim_id": claim_id,
        "disease": claim.get("disease"),
        "claim_amount": float(claim.get("claim_amount") or 0),
        "status": claim.get("status"),
        "ai_decision": claim.get("ai_decision"),
        "ai_reasoning": claim.get("ai_reasoning"),
        "ai_confidence": float(claim.get("ai_confidence") or 0),
        "fraud_score": claim.get("fraud_score"),
        "tx_hash": claim.get("tx_hash"),
        "source": "claims_table_only",
        "steps": [],
        "audit_trail": [],
    }

    try:
        from orchestrator.graph_router import get_checkpoints
        cp = get_checkpoints(claim_id)
        trace["source"] = "langgraph_checkpoints"
        trace["steps"] = cp["steps"]
        trace["audit_trail"] = cp["audit_trail"]
        trace["total_checkpoints"] = cp["total_checkpoints"]
        trace["is_paused"] = cp["final"]["is_paused"]
    except HTTPException:
        pass   # no graph run for this claim — table fallback stands
    except Exception:
        pass

    return trace

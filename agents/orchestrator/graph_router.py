"""
agents/orchestrator/graph_router.py — LangGraph workflow endpoints.

  POST /agent/graph/run/{claim_id}        — start (or restart) the graph for a claim
  GET  /agent/graph/state/{thread_id}     — current state + audit trail
  POST /agent/graph/resume/{thread_id}    — human approves/rejects, graph continues
  GET  /agent/graph/checkpoints/{claim_id}— full replay history (flight recorder)
  GET  /agent/graph/review-queue          — all claims paused at human_checkpoint

The legacy POST /agent/orchestrate/claim/{id} remains untouched as a fallback.
Endpoints are sync `def` on purpose: FastAPI runs them in its threadpool,
which keeps the SqliteSaver connection usage simple and safe.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from shared import metrics

logger = logging.getLogger("clearclaim.graph.api")
router = APIRouter()

_PAUSED_THREADS: dict = {}   # thread_id -> claim_id (in-memory review queue index)


def _thread_id(claim_id: int) -> str:
    return f"claim-{claim_id}"


def _config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


def _serialize_state(snapshot) -> dict:
    values = snapshot.values or {}
    next_nodes = list(snapshot.next or [])
    return {
        "thread_id": snapshot.config.get("configurable", {}).get("thread_id"),
        "paused_at": next_nodes,
        "is_paused": "human_checkpoint" in next_nodes,
        "is_complete": not next_nodes,
        "claim_id": values.get("claim_id"),
        "fraud_score": values.get("fraud_score"),
        "fraud_indicators": values.get("fraud_indicators"),
        "payable_amount": values.get("payable_amount"),
        "ai_decision": values.get("ai_decision"),
        "ai_reasoning": values.get("ai_reasoning"),
        "confidence": values.get("confidence"),
        "tx_hash": values.get("tx_hash"),
        "error": values.get("error"),
        "audit_trail": values.get("audit_trail", []),
    }


class ResumeRequest(BaseModel):
    decision: Optional[str] = None   # "Approve" | "Reject" | None (keep AI decision)
    notes: Optional[str] = None


@router.post("/agent/graph/run/{claim_id}")
def run_graph(claim_id: int):
    """Runs the LangGraph pipeline for one claim. If it hits the human
    checkpoint, returns paused=true and the claim appears in the review queue."""
    from orchestrator.graph import claim_graph, initial_state

    thread_id = _thread_id(claim_id)
    started = time.time()
    metrics.incr("graph_runs")
    try:
        claim_graph.invoke(initial_state(claim_id), _config(thread_id))
    except Exception as e:
        logger.error(f"[GraphAPI] run failed for claim {claim_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Graph execution failed: {e}")

    snapshot = claim_graph.get_state(_config(thread_id))
    result = _serialize_state(snapshot)
    result["total_time_ms"] = int((time.time() - started) * 1000)
    metrics.observe_latency("langgraph_orchestrator", result["total_time_ms"])

    if result["is_paused"]:
        _PAUSED_THREADS[thread_id] = claim_id
        result["message"] = ("Paused for human review — confidence/fraud/value threshold hit. "
                             "Resume via POST /agent/graph/resume/" + thread_id)
    else:
        _PAUSED_THREADS.pop(thread_id, None)
    return result


@router.get("/agent/graph/state/{thread_id}")
def get_graph_state(thread_id: str):
    """Inspect the live state + audit trail of any graph thread."""
    from orchestrator.graph import claim_graph
    snapshot = claim_graph.get_state(_config(thread_id))
    if not snapshot.values:
        raise HTTPException(status_code=404, detail=f"No graph state for thread '{thread_id}'")
    return _serialize_state(snapshot)


@router.post("/agent/graph/resume/{thread_id}")
def resume_graph(thread_id: str, req: ResumeRequest):
    """Admin resolves a human checkpoint. Optionally overrides the AI decision,
    then the graph continues autonomously from the exact node it paused on."""
    from orchestrator.graph import claim_graph

    config = _config(thread_id)
    snapshot = claim_graph.get_state(config)
    if not snapshot.values:
        raise HTTPException(status_code=404, detail=f"No graph state for thread '{thread_id}'")
    if "human_checkpoint" not in (snapshot.next or []):
        raise HTTPException(status_code=409,
                            detail="Graph is not paused at human_checkpoint for this thread.")

    if req.decision and req.decision not in ("Approve", "Reject"):
        raise HTTPException(status_code=400, detail="decision must be 'Approve' or 'Reject'")

    update = {"human_decision": req.decision}
    if req.notes:
        prev = snapshot.values.get("ai_reasoning") or ""
        update["ai_reasoning"] = f"{prev} [Admin notes: {req.notes}]"
    claim_graph.update_state(config, update)

    try:
        claim_graph.invoke(None, config)   # None input = resume from checkpoint
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume failed: {e}")

    _PAUSED_THREADS.pop(thread_id, None)
    final = claim_graph.get_state(config)
    result = _serialize_state(final)
    result["message"] = "Graph resumed and completed."
    return result


@router.get("/agent/graph/checkpoints/{claim_id}")
def get_checkpoints(claim_id: int):
    """Flight-recorder replay: every checkpoint the graph wrote for this claim,
    oldest first, with the node that ran and the state after it."""
    from orchestrator.graph import claim_graph
    config = _config(_thread_id(claim_id))
    history = list(claim_graph.get_state_history(config))
    if not history:
        raise HTTPException(status_code=404, detail=f"No checkpoints for claim {claim_id}")

    steps = []
    prev_next = None
    for snap in reversed(history):   # oldest → newest
        meta = snap.metadata or {}
        # The node that just executed is what the PREVIOUS checkpoint queued.
        if meta.get("source") == "update":
            executed = "human_checkpoint (admin update)"
        elif prev_next:
            executed = ", ".join(prev_next)
        else:
            executed = "__start__"
        steps.append({
            "step": meta.get("step"),
            "node": executed,
            "next": list(snap.next or []),
            "decision_so_far": (snap.values or {}).get("ai_decision"),
            "confidence": (snap.values or {}).get("confidence"),
            "created_at": snap.created_at,
        })
        prev_next = list(snap.next or [])
    latest = claim_graph.get_state(config)
    return {
        "claim_id": claim_id,
        "thread_id": _thread_id(claim_id),
        "total_checkpoints": len(steps),
        "steps": steps,
        "audit_trail": (latest.values or {}).get("audit_trail", []),
        "final": _serialize_state(latest),
    }


@router.get("/agent/graph/review-queue")
def review_queue():
    """Claims currently paused at human_checkpoint, for the admin Review Queue UI.
    Rebuilt from checkpoint storage so it survives process restarts."""
    from orchestrator.graph import claim_graph
    from shared.db import get_claim_details, get_db_connection

    # Restart-safe: candidates = in-memory paused threads ∪ all Pending claims
    candidates = dict(_PAUSED_THREADS)
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT claim_id FROM claims WHERE status = 'Pending'")
            for (cid,) in cur.fetchall():
                candidates.setdefault(_thread_id(cid), cid)
        conn.close()
    except Exception as e:
        logger.warning(f"[GraphAPI] review-queue DB scan failed: {e}")

    queue = []
    for thread_id, claim_id in candidates.items():
        snap = claim_graph.get_state(_config(thread_id))
        if "human_checkpoint" not in (snap.next or []):
            _PAUSED_THREADS.pop(thread_id, None)
            continue
        _PAUSED_THREADS[thread_id] = claim_id
        claim = get_claim_details(claim_id) or {}
        s = _serialize_state(snap)
        queue.append({
            "thread_id": thread_id,
            "claim_id": claim_id,
            "disease": claim.get("disease"),
            "claim_amount": float(claim.get("claim_amount") or 0),
            "ai_decision": s["ai_decision"],
            "ai_reasoning": s["ai_reasoning"],
            "confidence": s["confidence"],
            "fraud_score": s["fraud_score"],
            "payable_amount": s["payable_amount"],
        })
    return {"count": len(queue), "queue": queue}

"""
agents/rlhf/router.py — Exposes the RLHF learning loop as API endpoints.

This is the "self-improvement" agent — makes ClearClaim genuinely
adaptive rather than static. Perfect judge-facing demo:
"Every human override teaches the AI a new rule automatically."
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter
from pathlib import Path
import json

router = APIRouter()

LEARNED_RULES_PATH = Path(__file__).parent.parent / "shared" / "learned_rules.json"


@router.post("/agent/rlhf/run")
def trigger_learning_loop():
    """
    Manually trigger one full RLHF cycle. Returns learning summary.
    In production this runs nightly via APScheduler.
    """
    from rlhf_pipeline import run_rlhf_loop
    return run_rlhf_loop()


@router.get("/agent/rlhf/rules")
def get_all_learned_rules():
    """Returns all rules the AI has learned from human overrides."""
    if not LEARNED_RULES_PATH.exists():
        return {"agents": {}, "total_rules": 0}

    try:
        rules = json.loads(LEARNED_RULES_PATH.read_text())
        total = sum(len(v) for v in rules.values() if isinstance(v, list))
        return {"agents": rules, "total_rules": total}
    except Exception as e:
        return {"error": str(e), "agents": {}, "total_rules": 0}


@router.get("/agent/rlhf/status")
def rlhf_status():
    """Health check for the RLHF pipeline."""
    rules_exist = LEARNED_RULES_PATH.exists()
    total = 0
    if rules_exist:
        try:
            data = json.loads(LEARNED_RULES_PATH.read_text())
            total = sum(len(v) for v in data.values() if isinstance(v, list))
        except Exception:
            pass
    return {
        "status": "online",
        "rules_file_exists": rules_exist,
        "total_learned_rules": total,
        "description": "In-context learning from human overrides — pseudo-RLHF for LLM agents",
    }

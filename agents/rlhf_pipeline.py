"""
agents/rlhf_pipeline.py — Pseudo-Reinforcement-Learning Pipeline
===================================================================
This is NOT model retraining — that's impossible in a hackathon.
Instead, we use "In-Context Learning" (industry standard for LLM improvement):

  1. Every time a HUMAN admin overrides an AI decision → log it to AgentLearningLog
  2. Every 24 hours, this pipeline:
     a. Fetches recent overrides
     b. Asks Gemini "what rule did the human apply that you missed?"
     c. Appends learned rules to agents/shared/learned_rules.json
  3. Each agent prepends these learned rules to its system prompt

This is how Anthropic, OpenAI, and Kore.ai actually improve agents in production
without retraining base models. It's real, measurable, and demonstrable.

Endpoints exposed via chat_agent for the demo:
  POST /agent/rlhf/run  — Trigger the learning loop
  GET  /agent/rlhf/rules — See what the AI has learned
"""
import os
import sys
import json
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shared.db import get_human_overrides, ensure_learning_table
from shared.gemini_client import generate_response

LEARNED_RULES_PATH = Path(__file__).parent / "shared" / "learned_rules.json"


def _load_learned_rules() -> dict:
    if LEARNED_RULES_PATH.exists():
        try:
            return json.loads(LEARNED_RULES_PATH.read_text())
        except Exception:
            return {}
    return {}


def _save_learned_rules(rules: dict):
    LEARNED_RULES_PATH.write_text(json.dumps(rules, indent=2))


def get_learned_context(agent_name: str) -> str:
    """
    Returns learned rules for injection into an agent's system prompt.
    Called by claim_processor / fraud_detector before every LLM invocation.
    """
    rules = _load_learned_rules().get(agent_name, [])
    if not rules:
        return ""
    header = "\n\n=== LEARNED RULES FROM PAST HUMAN OVERRIDES ===\n"
    body = "\n".join(f"- {r['rule']} (learned {r['learned_at']})" for r in rules[-5:])
    return header + body + "\n=== END LEARNED RULES ===\n"


def _fetch_overrides_from_db():
    """AI-vs-human decision mismatches — the learning signal."""
    ensure_learning_table()
    return get_human_overrides(limit=20)


def run_rlhf_loop() -> dict:
    """Executes one full learning cycle. Returns summary for the API."""
    print("[RLHF] Starting learning loop...")
    overrides = _fetch_overrides_from_db()

    if not overrides:
        return {
            "status": "no_overrides",
            "message": "No human overrides found. Agent decisions align with human judgment.",
            "learned": 0,
        }

    print(f"[RLHF] Found {len(overrides)} overrides. Generating rules via Gemini...")
    rules = _load_learned_rules()
    rules.setdefault("claim_processor", [])
    new_rules_added = 0

    for row in overrides[:5]:  # only process 5 per run to save quota
        reflection_prompt = f"""You are an alignment engine analyzing an AI insurance agent's mistakes.

Case:
- Claim #{row['claim_id']} for disease "{row['disease']}", amount Rs{row['claim_amount']}
- AI decided: {row['ai_decision']}
- AI reasoning: {row['ai_reasoning'] or 'None recorded'}
- Human admin overrode to: {row['status']}

Task: In ONE short sentence (<25 words), state the concrete decision rule the
human likely applied that the AI missed. Start with "When...". No preamble.
"""
        try:
            correction = generate_response(reflection_prompt).strip()
            if correction and correction.lower().startswith("when") and len(correction) < 200:
                from datetime import datetime
                rules["claim_processor"].append({
                    "rule": correction,
                    "source_claim_id": row['claim_id'],
                    "learned_at": datetime.now().isoformat()[:19],
                })
                new_rules_added += 1
                print(f"[RLHF] Learned: {correction}")
        except Exception as e:
            print(f"[RLHF] Rule extraction failed for claim {row['claim_id']}: {e}")

    # Keep only the last 20 rules per agent (avoid prompt bloat)
    rules["claim_processor"] = rules["claim_processor"][-20:]
    _save_learned_rules(rules)

    return {
        "status": "success",
        "overrides_found": len(overrides),
        "rules_learned_this_run": new_rules_added,
        "total_rules_in_memory": len(rules["claim_processor"]),
        "message": f"Learned {new_rules_added} new rule(s) from {len(overrides)} human overrides.",
    }


if __name__ == "__main__":
    result = run_rlhf_loop()
    print(json.dumps(result, indent=2))

"""
agents/orchestrator/router.py — Central Orchestrator Agent (Agent 4)

The Orchestrator is the brain of ClearClaim AI. It chains agents together
so they work autonomously without human coordination:

  Claim submitted → Fraud check → if LOW risk → Gemini deep analysis → Blockchain record
                               → if HIGH risk → Auto-reject (skip expensive Gemini call)

  /agent/orchestrate/claim/{claim_id}  — Process one claim through full pipeline
  /agent/orchestrate/status            — Show all 6 agent statuses
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from shared.mcp_client import invoke_mcp_tool

router = APIRouter()

# Internal service base (same process, port 8000)
AGENT_BASE = "http://localhost:8000"


class AgentPipelineResult(BaseModel):
    claim_id: int
    pipeline_steps: List[str]
    fraud_score: Optional[int] = None
    fraud_risk_level: Optional[str] = None
    fast_reject: bool = False          # True = auto-rejected by fraud score alone
    ai_decision: Optional[str] = None
    ai_reasoning: Optional[str] = None
    confidence_score: Optional[float] = None
    tx_hash: Optional[str] = None
    total_time_ms: int = 0


@router.post("/agent/orchestrate/claim/{claim_id}", response_model=AgentPipelineResult)
async def orchestrate_single_claim(claim_id: int):
    """
    Full autonomous pipeline for one claim:
    Step 1 → Fraud Detector  (instant, algorithmic, no LLM)
    Step 2 → Decision gate   (score >= 75 → auto-reject, skip Gemini to save API quota)
    Step 3 → Claim Processor (Gemini deep analysis, only for non-obvious cases)
    Step 4 → Blockchain      (always records final decision)
    """
    start_time = datetime.now()
    steps = []
    result = AgentPipelineResult(claim_id=claim_id, pipeline_steps=steps)

    async with httpx.AsyncClient(timeout=60.0) as client:

        # ── Step 1: Fraud Score (fast, no LLM) ───────────────────────────────
        steps.append(f"[Step 1] Running fraud detection on Claim #{claim_id} via MCP...")
        try:
            fraud_data = await invoke_mcp_tool("score_fraud", {"claim_id": claim_id})
            result.fraud_score = fraud_data.get("score", 0)
            result.fraud_risk_level = fraud_data.get("risk_level", "Low")
            steps.append(
                f"[Step 1] Fraud score: {result.fraud_score}/100 "
                f"({result.fraud_risk_level} risk) "
                f"| Indicators: {', '.join(fraud_data.get('indicators', [])) or 'None'}"
            )
        except Exception as e:
            steps.append(f"[Step 1] Fraud detection failed via MCP: {e}. Continuing to full AI analysis.")
            result.fraud_score = 0
            result.fraud_risk_level = "Unknown"

        # ── Step 2: Multi-Agent Coordination Gate ────────────────────────────
        clinical_context = ""
        if result.fraud_score is not None and result.fraud_score >= 50 and result.fraud_score < 75:
            steps.append(f"[Step 2] Fraud score {result.fraud_score} (Elevated Risk). Consulting Clinical Assistant Agent via MCP for cross-verification...")
            try:
                clin_data = await invoke_mcp_tool("cross_verify_clinical", {"claim_id": claim_id})
                if clin_data:
                    anomalies = ', '.join(clin_data.get('anomalies_found', []))
                    clinical_context = f"Secondary Clinical Verification: {clin_data.get('medical_summary', '')} | Anomalies: {anomalies}"
                    steps.append(f"[Step 2] Clinical Assistant provided verification context via MCP.")
            except Exception as e:
                steps.append(f"[Step 2] Clinical Assistant consultation via MCP failed: {e}")

        if result.fraud_score is not None and result.fraud_score >= 75:
            steps.append(
                f"[Step 2] FAST REJECT — Fraud score {result.fraud_score} >= 75. "
                f"Skipping Gemini to save quota. Auto-rejecting claim."
            )
            result.fast_reject = True
            result.ai_decision = "Reject"
            result.ai_reasoning = (
                f"Auto-rejected by Orchestrator. Fraud score {result.fraud_score}/100 "
                f"exceeds auto-reject threshold (75). "
                f"Indicators: {', '.join(fraud_data.get('indicators', []))}"
            )
            result.confidence_score = 0.95

            # Write rejection to DB via WriteAPI
            try:
                wr = await client.put(
                    f"{os.getenv('WRITE_API', 'http://localhost:5130')}"
                    f"/api/admin/claims/reject/{claim_id}"
                )
                steps.append(f"[Step 2] Rejection written to database.")
            except Exception as e:
                steps.append(f"[Step 2] DB write failed: {e}")

            # Still record on blockchain
            steps.append("[Step 3] Skipped — Gemini not needed for high-confidence fraud reject.")
        else:
            steps.append(
                f"[Step 2] Score {result.fraud_score} < 75. "
                f"Proceeding to Gemini deep analysis..."
            )

            # ── Step 3: Claim Processor (Gemini) ─────────────────────────────
            steps.append(f"[Step 3] Sending Claim #{claim_id} to Gemini 3.5 Flash...")
            try:
                # We call the internal function directly to avoid HTTP overhead
                from shared.db import get_policy_details, get_customer_history, get_previous_claims_total, check_hospital_validity
                from shared.gemini_client import generate_json_response
                from shared.prompts import CLAIM_PROCESSOR_SYSTEM_PROMPT
                import psycopg2
                from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
                from datetime import date

                # Fetch claim from DB
                conn = psycopg2.connect(
                    host=DB_HOST, port=DB_PORT,
                    dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
                )
                try:
                    from psycopg2.extras import RealDictCursor
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute('SELECT * FROM claims WHERE claim_id = %s', (claim_id,))
                        claim = cur.fetchone()
                        claim = dict(claim) if claim else None
                finally:
                    conn.close()

                if not claim:
                    raise ValueError(f"Claim {claim_id} not found in DB")

                policy = get_policy_details(claim["policy_id"])
                customer = get_customer_history(policy["customer_id"])
                prev_approved = get_previous_claims_total(claim["policy_id"])
                hospital_valid = check_hospital_validity(claim["policy_id"], claim["hospital_id"])
                coverage = float(policy.get("coverage_amount", 0))

                try:
                    start = policy.get("start_date")
                    if isinstance(start, str):
                        start = date.fromisoformat(start[:10])
                    days_since_start = (date.today() - start).days if isinstance(start, date) else 60
                except Exception:
                    days_since_start = 60

                prompt = CLAIM_PROCESSOR_SYSTEM_PROMPT.format(
                    customer_name=customer.get("customer_name", "Unknown"),
                    customer_age=customer.get("age", "Unknown"),
                    customer_gender=customer.get("gender", "Unknown"),
                    historical_disease=customer.get("historical_disease", "No"),
                    days_since_start=days_since_start,
                    coverage_amount=coverage,
                    prev_approved_total=prev_approved,
                    remaining_coverage=coverage - prev_approved,
                    claim_id=claim_id,
                    disease=claim.get("disease", "Unknown"),
                    claim_amount=claim.get("claim_amount", 0),
                    description=claim.get("description", ""),
                    hospital_valid="YES" if hospital_valid else "NO",
                    rag_context="(not retrieved in legacy pipeline)",
                )
                prompt += f"\n\n[FRAUD CONTEXT]: Algorithmic fraud score {result.fraud_score}/100."
                
                if clinical_context:
                    prompt += f"\n\n[MULTI-AGENT CONTEXT]: {clinical_context}"

                ai = generate_json_response(prompt)
                result.ai_decision = ai.get("decision", "Flag")
                result.ai_reasoning = ai.get("reasoning", "No reasoning returned.")
                result.confidence_score = float(ai.get("confidence_score", 0.0))

                steps.append(
                    f"[Step 3] Gemini decision: {result.ai_decision} "
                    f"(confidence {int(result.confidence_score * 100)}%)"
                )

                # Write to WriteAPI
                endpoint = "approve" if result.ai_decision == "Approve" else "reject"
                try:
                    await client.put(
                        f"{os.getenv('WRITE_API', 'http://localhost:5130')}"
                        f"/api/admin/claims/{endpoint}/{claim_id}"
                    )
                    steps.append(f"[Step 3] Decision written to database via WriteAPI.")
                except Exception as e:
                    steps.append(f"[Step 3] WriteAPI call failed: {e}")

                # Save AI columns directly to DB
                conn2 = psycopg2.connect(
                    host=DB_HOST, port=DB_PORT,
                    dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
                )
                try:
                    with conn2.cursor() as cur:
                        cur.execute(
                            'UPDATE claims SET ai_decision=%s, ai_reasoning=%s, ai_confidence=%s WHERE claim_id=%s',
                            (result.ai_decision, result.ai_reasoning, result.confidence_score, claim_id)
                        )
                    conn2.commit()
                finally:
                    conn2.close()

            except Exception as e:
                steps.append(f"[Step 3] Gemini analysis failed: {e}. Flagged for manual review.")
                result.ai_decision = "Flag"
                result.ai_reasoning = f"Orchestrator error: {str(e)}"
                result.confidence_score = 0.0

        # ── Step 4: Blockchain record (always) ────────────────────────────────
        steps.append(f"[Step 4] Recording decision on X Layer blockchain...")
        try:
            from shared.blockchain import record_claim_decision
            conf_pct = int((result.confidence_score or 0) * 100)
            tx = record_claim_decision(
                claim_id, result.ai_decision or "Flag",
                result.ai_reasoning or "", conf_pct
            )
            if tx:
                result.tx_hash = tx
                # Save tx_hash to DB
                import psycopg2
                from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
                conn3 = psycopg2.connect(
                    host=DB_HOST, port=DB_PORT,
                    dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
                )
                try:
                    with conn3.cursor() as cur:
                        cur.execute('UPDATE claims SET tx_hash=%s WHERE claim_id=%s', (tx, claim_id))
                    conn3.commit()
                finally:
                    conn3.close()
                steps.append(f"[Step 4] Onchain TX: {tx[:20]}... | X Layer Explorer: https://explorer.xlayer.tech/tx/{tx}")
            else:
                steps.append("[Step 4] Blockchain unavailable (env keys not set). Skipped.")
        except Exception as e:
            steps.append(f"[Step 4] Blockchain write failed: {e}")

    result.pipeline_steps = steps
    result.total_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
    return result


@router.get("/agent/orchestrate/status")
def orchestrator_status():
    """Returns the status of all 6 agents in the ClearClaim AI system."""
    return {
        "orchestrator": "ClearClaim AI Orchestrator v1.0",
        "agents": [
            {"id": 1, "name": "Claim Processor",   "endpoint": "POST /agent/process-claims",         "type": "Gemini 3.5 Flash", "status": "active"},
            {"id": 2, "name": "Fraud Detector",     "endpoint": "GET /agent/fraud-score/{id}",        "type": "Algorithmic",      "status": "active"},
            {"id": 3, "name": "Policy Advisor",     "endpoint": "POST /agent/recommend-policy",       "type": "Gemini 3.5 Flash", "status": "active"},
            {"id": 4, "name": "Orchestrator",       "endpoint": "POST /agent/orchestrate/claim/{id}", "type": "Pipeline Router",  "status": "active"},
            {"id": 5, "name": "Predictive Risk",    "endpoint": "GET /agent/predictive-scan",         "type": "Gemini 3.5 Flash", "status": "active"},
            {"id": 6, "name": "Health Guardian",    "endpoint": "POST /agent/health-guardian/{id}",   "type": "Gemini 3.5 Flash", "status": "active"},
        ],
        "blockchain": "X Layer Testnet (chainId: 195)",
        "llm": "Gemini 3.5 Flash (google-generativeai)",
        "marketplace": "OKX.AI Genesis Hackathon 2026",
    }

"""
agents/claim_processor/router.py — Claim Processor Agent Router
Exposes:
  POST /agent/process-claims        — batch process all pending claims (returns list)
  GET  /agent/process-claims/stream — SSE stream for real-time terminal updates
"""
import sys
import os
import json
import asyncio
import psycopg2
from datetime import date
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, AsyncGenerator

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from shared.config import READ_API, WRITE_API, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from shared.db import get_customer_history, get_policy_details, get_previous_claims_total, check_hospital_validity
from shared.gemini_client import generate_json_response
from shared.prompts import CLAIM_PROCESSOR_SYSTEM_PROMPT
from shared.rag import semantic_search

router = APIRouter()


class ClaimDecisionResponse(BaseModel):
    claim_id: int
    decision: str
    reasoning: str
    confidence_score: float
    fraud_indicators: List[str]
    tx_hash: str | None = None


def _write_ai_cols_to_db(claim_id: int, decision: str, reasoning: str,
                         confidence: float, tx_hash: str | None = None):
    """Direct DB update for AI output columns — WriteAPI doesn't have this endpoint."""
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                'UPDATE claims SET ai_decision = %s, ai_reasoning = %s, '
                'ai_confidence = %s, tx_hash = COALESCE(%s, tx_hash) WHERE claim_id = %s',
                (decision, reasoning, confidence, tx_hash, claim_id)
            )
        conn.commit()
    finally:
        conn.close()


async def _fetch_pending_claims(client: httpx.AsyncClient) -> list:
    """
    Pending claims via ReadAPI, falling back to a direct DB query.
    The fallback keeps 'Run AI Agent' working on deployments where the
    READ_API env var isn't set (defaults to localhost and fails).
    """
    try:
        res = await client.get(f"{READ_API}/api/admin/claims/pending")
        res.raise_for_status()
        return res.json().get("records", []) or []
    except Exception as e:
        print(f"[ClaimProcessor] ReadAPI unreachable ({e}) — reading pending claims from DB directly.")
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(
            host=DB_HOST, port=DB_PORT,
            dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
        )
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT claim_id, policy_id, hospital_id, claim_date, claim_amount, "
                    "disease, status, doctor_name, description "
                    "FROM claims WHERE status = 'Pending' ORDER BY claim_id"
                )
                rows = cur.fetchall()
        finally:
            conn.close()
        return [{
            "claimId":     r["claim_id"],
            "policyId":    r["policy_id"],
            "hospitalId":  r["hospital_id"],
            "claimDate":   str(r["claim_date"] or ""),
            "claimAmount": float(r["claim_amount"] or 0),
            "disease":     r["disease"],
            "status":      r["status"],
            "doctorName":  r["doctor_name"],
            "description": r["description"],
        } for r in rows]


def _write_status_to_db(claim_id: int, decision: str):
    """Direct status update — used when the WriteAPI is unreachable so a
    decided claim can never get stuck in Pending."""
    new_status = "Approved" if decision == "Approve" else "Rejected"
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
    )
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE claims SET status = %s WHERE claim_id = %s",
                        (new_status, claim_id))
        conn.commit()
    finally:
        conn.close()


async def _process_single_claim(claim: dict, client: httpx.AsyncClient) -> ClaimDecisionResponse:
    """Core logic: fetch context, call Gemini, write decision back."""
    claim_id   = claim.get("claimId")
    policy_id  = claim.get("policyId")
    hospital_id = claim.get("hospitalId")
    disease    = claim.get("disease", "Unknown")
    claim_amount = claim.get("claimAmount", 0)
    description  = claim.get("description", "")
    claim_date_raw = claim.get("claimDate", "")

    # Gather context from DB
    policy   = get_policy_details(policy_id)
    if not policy:
        return ClaimDecisionResponse(
            claim_id=claim_id, decision="Flag",
            reasoning="Policy details not found. Flagged for manual review.",
            confidence_score=0.0, fraud_indicators=["Missing policy context"]
        )

    customer_id = policy.get("customer_id")
    customer = get_customer_history(customer_id)
    prev_approved = get_previous_claims_total(policy_id)
    hospital_valid = check_hospital_validity(policy_id, hospital_id)

    coverage_amount   = float(policy.get("coverage_amount", 0))
    remaining_coverage = coverage_amount - float(prev_approved)

    # Days since policy start — real calculation using today's date
    try:
        start = policy.get("start_date")
        if isinstance(start, str):
            start = date.fromisoformat(start[:10])
        if isinstance(start, date):
            days_since_start = (date.today() - start).days
        else:
            days_since_start = 60
    except Exception:
        days_since_start = 60

    # RAG Semantic Search — best-effort: a failed embedding must never break adjudication
    rag_query = f"Disease: {disease}. Description: {description}"
    try:
        retrieved_clauses = semantic_search(rag_query, top_k=2)
        rag_context = "\n".join([f"- {clause}" for clause in retrieved_clauses])
    except Exception:
        rag_context = "(policy clause retrieval unavailable — rely on the rules above)"

    # Build and send to Gemini
    prompt = CLAIM_PROCESSOR_SYSTEM_PROMPT.format(
        customer_name=customer.get("customer_name", "Unknown"),
        customer_age=customer.get("age", "N/A"),
        customer_gender=customer.get("gender", "N/A"),
        historical_disease=customer.get("historical_disease", "No"),
        days_since_start=days_since_start,
        coverage_amount=coverage_amount,
        prev_approved_total=prev_approved,
        remaining_coverage=remaining_coverage,
        claim_id=claim_id,
        disease=disease,
        claim_amount=claim_amount,
        description=description,
        hospital_valid=hospital_valid,
        rag_context=rag_context
    )

    ai = generate_json_response(prompt)
    decision   = ai.get("decision", "Flag")
    reasoning  = ai.get("reasoning", "No reasoning returned.")
    confidence = float(ai.get("confidence_score", 0.0))
    indicators = ai.get("fraud_indicators", [])

    # Write decision to .NET WriteAPI — direct DB fallback if unreachable
    try:
        if decision == "Approve":
            r = await client.put(f"{WRITE_API}/api/admin/claims/approve/{claim_id}")
            r.raise_for_status()
        elif decision == "Reject":
            r = await client.put(f"{WRITE_API}/api/admin/claims/reject/{claim_id}")
            r.raise_for_status()
    except Exception as e:
        print(f"[ClaimProcessor] WriteAPI failed for claim {claim_id} ({e}) — writing status to DB directly.")
        if decision in ("Approve", "Reject"):
            try:
                _write_status_to_db(claim_id, decision)
            except Exception as e2:
                print(f"[ClaimProcessor] Direct DB status write also failed: {e2}")

    # Try blockchain recording (import here to avoid circular or missing deps)
    tx_hash = None
    try:
        from shared.blockchain import record_claim_decision
        tx_hash = record_claim_decision(claim_id, decision, reasoning, int(confidence * 100))
    except Exception as e:
        print(f"[ClaimProcessor] Blockchain write skipped for claim {claim_id}: {e}")

    # Write AI columns to DB
    _write_ai_cols_to_db(claim_id, decision, reasoning, confidence, tx_hash)

    return ClaimDecisionResponse(
        claim_id=claim_id,
        decision=decision,
        reasoning=reasoning,
        confidence_score=confidence,
        fraud_indicators=indicators,
        tx_hash=tx_hash,
    )


@router.post("/agent/process-claims", response_model=List[ClaimDecisionResponse])
async def process_pending_claims():
    """Batch: fetch all pending claims, run Gemini on each, return full list."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            claims = await _fetch_pending_claims(client)
        except Exception as e:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Failed to fetch pending claims: {e}")

    if not claims:
        return []

    results = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for claim in claims:
            result = await _process_single_claim(claim, client)
            results.append(result)

    return results


@router.get("/agent/process-claims/stream")
async def stream_process_claims():
    """
    SSE stream: emits one event per claim as Gemini processes it.
    Frontend connects with EventSource to get real-time terminal updates.
    
    Event format: data: {"type": "log", "claim_id": 13, "decision": "Approve", 
                          "reasoning": "...", "confidence_score": 0.95, "tx_hash": "0x..."}
    """
    async def event_generator() -> AsyncGenerator[str, None]:
        # Fetch pending claims (ReadAPI with direct-DB fallback)
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                claims = await _fetch_pending_claims(client)
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        if not claims:
            yield f"data: {json.dumps({'type': 'complete', 'message': 'No pending claims to process.'})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'start', 'total': len(claims), 'message': f'Processing {len(claims)} pending claims via Gemini 3.5 Flash…'})}\n\n"
        await asyncio.sleep(0.1)

        results = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for i, claim in enumerate(claims):
                claim_id = claim.get("claimId")
                disease  = claim.get("disease", "Unknown")
                amount   = claim.get("claimAmount", 0)

                yield f"data: {json.dumps({'type': 'processing', 'claim_id': claim_id, 'message': f'Analyzing Claim #{claim_id} — {disease} (₹{amount:,})…'})}\n\n"
                await asyncio.sleep(0.05)

                result = await _process_single_claim(claim, client)
                results.append(result)

                decision_emoji = {"Approve": "✓", "Reject": "✗", "Flag": "⚑"}.get(result.decision, "?")
                conf_pct = int(result.confidence_score * 100)
                tx_info  = f" · TX: {result.tx_hash[:10]}…" if result.tx_hash else ""

                yield f"data: {json.dumps({'type': 'result', 'claim_id': claim_id, 'decision': result.decision, 'reasoning': result.reasoning, 'confidence_score': result.confidence_score, 'fraud_indicators': result.fraud_indicators, 'tx_hash': result.tx_hash, 'message': f'Claim #{claim_id}: {decision_emoji} {result.decision} (Confidence: {conf_pct}%){tx_info}'})}\n\n"
                await asyncio.sleep(0.05)

        approved = sum(1 for r in results if r.decision == "Approve")
        rejected = sum(1 for r in results if r.decision == "Reject")
        flagged  = sum(1 for r in results if r.decision == "Flag")

        yield f"data: {json.dumps({'type': 'complete', 'approved': approved, 'rejected': rejected, 'flagged': flagged, 'message': f'Done: {approved} approved · {rejected} rejected · {flagged} flagged'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

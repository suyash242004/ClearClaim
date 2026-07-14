import os
import sys
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

# Add the parent 'agents' directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.config import READ_API, WRITE_API
from shared.db import get_customer_history, get_policy_details, get_previous_claims_total, check_hospital_validity
from shared.gemini_client import generate_json_response
from shared.prompts import CLAIM_PROCESSOR_SYSTEM_PROMPT
from shared.blockchain import record_claim_decision

app = FastAPI(title="ClearClaim AI - Claim Processor Agent")

class ClaimDecisionResponse(BaseModel):
    claim_id: int
    decision: str
    reasoning: str
    confidence_score: float
    fraud_indicators: List[str]

@app.get("/agent/status")
def health_check():
    return {"status": "online", "agent": "claim_processor"}

@app.post("/agent/process-claims", response_model=List[ClaimDecisionResponse])
async def process_pending_claims():
    """
    Core Autonomous Loop:
    1. Fetch all pending claims from .NET ReadAPI
    2. For each claim, fetch full context directly from PostgreSQL
    3. Ask Gemini to evaluate the claim
    4. Write the decision back to .NET WriteAPI
    """
    # 1. Fetch pending claims
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{READ_API}/api/admin/claims/pending")
            res.raise_for_status()
            data = res.json()
            claims = data.get("records", [])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch pending claims: {e}")

    if not claims:
        return []

    results = []
    
    # 2. Process each claim
    for claim in claims:
        claim_id = claim.get("claimId")
        policy_id = claim.get("policyId")
        hospital_id = claim.get("hospitalId")
        disease = claim.get("disease")
        claim_amount = claim.get("claimAmount")
        description = claim.get("description")
        
        # Gather context from DB
        policy = get_policy_details(policy_id)
        if not policy:
            continue
            
        customer_id = policy.get("customer_id")
        customer = get_customer_history(customer_id)
        
        prev_approved_total = get_previous_claims_total(policy_id)
        hospital_valid = check_hospital_validity(policy_id, hospital_id)
        
        coverage_amount = policy.get("coverage_amount", 0)
        remaining_coverage = coverage_amount - prev_approved_total
        
        # Calculate actual days since policy start
        policy_start_str = policy.get("start_date")
        claim_date_str = claim.get("claimDate", "")[:10] if isinstance(claim.get("claimDate"), str) else str(claim.get("claimDate", ""))
        
        days_since_start = 60  # default fallback
        try:
            if isinstance(policy_start_str, date):
                policy_start = policy_start_str
            else:
                policy_start = datetime.strptime(str(policy_start_str)[:10], "%Y-%m-%d").date()
            
            if claim_date_str:
                claim_date = datetime.strptime(claim_date_str, "%Y-%m-%d").date()
                days_since_start = (claim_date - policy_start).days
        except Exception as e:
            print(f"Warning: Could not calculate days_since_start for claim {claim_id}: {e}")
        
        # 3. Ask Gemini
        prompt = CLAIM_PROCESSOR_SYSTEM_PROMPT.format(
            customer_name=customer.get("customer_name"),
            customer_age=customer.get("age"),
            customer_gender=customer.get("gender"),
            historical_disease=customer.get("historical_disease"),
            days_since_start=days_since_start,
            coverage_amount=coverage_amount,
            prev_approved_total=prev_approved_total,
            remaining_coverage=remaining_coverage,
            claim_id=claim_id,
            disease=disease,
            claim_amount=claim_amount,
            description=description,
            hospital_valid=hospital_valid
        )
        
        decision_json = generate_json_response(prompt)
        decision = decision_json.get("decision", "Flag")
        reasoning = decision_json.get("reasoning", "")
        confidence = decision_json.get("confidence_score", 0.0)
        fraud_score = decision_json.get("fraud_score", 0)
        
        # Record decision on blockchain
        tx_hash = record_claim_decision(
            claim_id=claim_id,
            decision=decision,
            reasoning=reasoning,
            confidence_percent=int(confidence * 100)
        )
        
        # 4. Write back to .NET WriteAPI
        async with httpx.AsyncClient() as client:
            try:
                # The write API endpoints are:
                # PUT /api/admin/claims/approve/{id}
                # PUT /api/admin/claims/reject/{id}
                # For Flag, we just don't call anything and let it sit as Pending, but we could update AI cols.
                
                if decision == "Approve":
                    await client.put(f"{WRITE_API}/api/admin/claims/approve/{claim_id}")
                elif decision == "Reject":
                    await client.put(f"{WRITE_API}/api/admin/claims/reject/{claim_id}")
                    
                # Note: Currently the .NET WriteAPI endpoints don't accept the AI columns in the PUT request body.
                # In a full integration, we would do a direct DB update here to populate ai_decision, fraud_score, etc.
                # For this demo phase, we will do a direct DB update to save the AI output.
                import psycopg2
                from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
                
                conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            "UPDATE Claims SET ai_decision = %s, ai_reasoning = %s, ai_confidence = %s, fraud_score = %s, tx_hash = %s WHERE claim_id = %s",
                            (decision, reasoning, confidence, fraud_score, tx_hash, claim_id)
                        )
                    conn.commit()
                finally:
                    conn.close()
                    
            except Exception as e:
                print(f"Failed to update claim {claim_id}: {e}")

        result = ClaimDecisionResponse(
            claim_id=claim_id,
            decision=decision,
            reasoning=reasoning,
            confidence_score=confidence,
            fraud_indicators=decision_json.get("fraud_indicators", [])
        )
        results.append(result)
        
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

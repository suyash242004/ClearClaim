import os
import sys
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

# Add the parent 'agents' directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.db import get_customer_history, get_policy_details, get_previous_claims_total

app = FastAPI(title="ClearClaim AI - Fraud Detector Agent")

class FraudScoreResponse(BaseModel):
    claim_id: int
    score: int
    risk_level: str
    indicators: List[str]

@app.get("/agent/status")
def health_check():
    return {"status": "online", "agent": "fraud_detector"}

@app.get("/agent/fraud-score/{claim_id}", response_model=FraudScoreResponse)
def calculate_fraud_score(claim_id: int):
    """
    Algorithmic fraud scoring (0-100). No LLM needed for this, pure logic.
    Provides instant risk assessment for the admin dashboard.
    """
    # Note: In a real integration we would fetch the specific claim details first.
    # For this hackathon demo, we will simulate fetching the claim data and focus on the logic.
    # We will fetch policy and customer using mock IDs for demonstration, or we can fetch the real claim.
    
    # Real implementation to fetch claim:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
    
    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM Claims WHERE claim_id = %s", (claim_id,))
            claim = cur.fetchone()
    finally:
        conn.close()
        
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    policy_id = claim.get("policy_id")
    disease = claim.get("disease", "")
    claim_amount = claim.get("claim_amount", 0)
    
    policy = get_policy_details(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    customer_id = policy.get("customer_id")
    customer = get_customer_history(customer_id)
    
    historical_disease = customer.get("historical_disease", "No")
    coverage_amount = policy.get("coverage_amount", 0)
    prev_approved_total = get_previous_claims_total(policy_id)
    remaining_coverage = coverage_amount - prev_approved_total
    
    # Scoring Logic
    score = 0
    indicators = []
    
    # Rule 1: Disease mismatch (+30-40 pts)
    # Expanded disease list for better fraud detection
    major_diseases = [
        'cardiac', 'cancer', 'transplant', 'tumor', 'bypass', 'surgery',
        'kidney', 'liver', 'heart', 'chemotherapy', 'dialysis', 'stroke',
        'angioplasty', 'coronary', 'malignant', 'metastasis', 'radiation',
        'oncology', 'cardiomyopathy', 'aneurysm', 'sepsis', 'intensive care'
    ]
    is_major = any(d in disease.lower() for d in major_diseases)
    
    if historical_disease.lower() == 'no' and is_major:
        score += 40
        indicators.append(f"Claiming major disease ({disease}) but has no historical medical issues.")
    elif historical_disease.lower() != 'no' and historical_disease.lower() not in disease.lower():
         # They have a history, but this claim doesn't seem related. Slightly suspicious depending on severity.
         score += 15
         indicators.append(f"Claiming {disease} which does not match history of {historical_disease}.")
        
    # Rule 2: Claim amount relative to coverage (+25 pts)
    if remaining_coverage > 0:
        utilization = float(claim_amount) / float(remaining_coverage)
        if utilization > 0.8:
            score += 25
            indicators.append(f"High utilization: Claim is {utilization*100:.1f}% of remaining coverage.")
        elif utilization > 0.5:
            score += 10
            indicators.append(f"Moderate utilization: Claim is {utilization*100:.1f}% of remaining coverage.")
            
    # Rule 3: High absolute amount (+10 pts)
    if claim_amount > 200000:
        score += 15
        indicators.append(f"High absolute claim value (₹{claim_amount}).")
        
    # Cap score at 100
    score = min(score, 100)
    
    # Determine risk level
    risk_level = "Low"
    if score >= 60:
        risk_level = "High"
    elif score >= 30:
        risk_level = "Medium"
        
    # Write score back to DB for demo
    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE Claims SET fraud_score = %s WHERE claim_id = %s",
                (score, claim_id)
            )
        conn.commit()
    finally:
        conn.close()
        
    return FraudScoreResponse(
        claim_id=claim_id,
        score=score,
        risk_level=risk_level,
        indicators=indicators
    )

if __name__ == "__main__":
    import uvicorn
    # Run on a different port than claim_processor if running simultaneously, 
    # but we can mount them on the same app later. For now, port 8001.
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

import os
import sys
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Add the parent 'agents' directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.config import READ_API
from shared.gemini_client import generate_json_response

app = FastAPI(title="ClearClaim AI - Policy Advisor Agent")

class PolicyRecommendationRequest(BaseModel):
    age: int
    family_size: int
    budget: int
    medical_history: str
    city: str

class PolicyRecommendationResponse(BaseModel):
    recommended_plan_id: int
    recommended_plan_name: str
    reasoning: str
    confidence_score: float

@app.get("/agent/status")
def health_check():
    return {"status": "online", "agent": "policy_advisor"}

@app.post("/agent/recommend-policy", response_model=PolicyRecommendationResponse)
async def recommend_policy(request: PolicyRecommendationRequest):
    """
    NLP Agent that recommends an insurance plan based on user profile.
    """
    # Fetch all available plans from ReadAPI
    # Wait, the ReadAPI doesn't have a direct /api/plans/search endpoint without setup in the hackathon codebase,
    # but let's query the DB directly to get all plans since it's faster for the agent context.
    import psycopg2
    from psycopg2.extras import RealDictCursor
    from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
    
    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM InsurancePlan")
            plans = cur.fetchall()
    finally:
        conn.close()

    if not plans:
        raise HTTPException(status_code=500, detail="No plans available in the system")

    # Format plans for the prompt
    plans_text = ""
    for p in plans:
        plans_text += f"- Plan ID: {p['plan_id']}, Name: {p['plan_name']}, Premium: ₹{p['premium_amount']}, Coverage: ₹{p['coverage_amount']}, Max Members: {p['max_members']}\n"

    prompt = f"""
    You are ClearClaim AI, a Policy Advisor.
    Recommend the best insurance plan for a customer based on their profile and our available plans.
    
    Customer Profile:
    - Age: {request.age}
    - Family Size: {request.family_size}
    - Budget (Premium): ₹{request.budget}
    - Medical History: {request.medical_history}
    - City: {request.city}
    
    Available Plans:
    {plans_text}
    
    CRITICAL RULES:
    1. If family_size = 1, you MUST recommend "Personal Medical Insurance" (Plan ID 1). Single individuals cannot use family plans.
    2. If family_size = 2 and includes parents (Father/Mother), recommend "Parent Medical Insurance" (Plan ID 3).
    3. If family_size = 2-4 without parents, recommend "Family Medical Insurance" (Plan ID 2).
    4. If family_size = 5-8, recommend "Complete Family Medical Insurance" (Plan ID 4).
    5. The recommended plan's max_members must be >= the customer's family size.
    6. Try to stay close to their budget, but prioritize health needs. If they have severe medical history, recommend higher coverage even if premium is slightly higher.
    7. Return your decision as JSON.
    
    JSON Format:
    {{
      "recommended_plan_id": 2,
      "recommended_plan_name": "Family Medical Insurance",
      "reasoning": "This plan covers your family of 4 and fits your budget, providing enough coverage for your history.",
      "confidence_score": 0.90
    }}
    """
    
    decision_json = generate_json_response(prompt)
    
    return PolicyRecommendationResponse(
        recommended_plan_id=decision_json.get("recommended_plan_id", 0),
        recommended_plan_name=decision_json.get("recommended_plan_name", "Unknown"),
        reasoning=decision_json.get("reasoning", "No reasoning provided"),
        confidence_score=decision_json.get("confidence_score", 0.0)
    )

if __name__ == "__main__":
    import uvicorn
    # Port 8002 for policy advisor
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)

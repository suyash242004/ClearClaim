import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from shared import gemini_client   # use gemini_client.model so key rotation / model fallback stay live
from shared.db import (
    get_claim_details,
    get_patient_intervention,
    get_customer_policies,
    submit_claim_draft,
    get_customer_claims
)
from policy_advisor.router import recommend_policy, PolicyRecommendationRequest

router = APIRouter()

class ChatMessage(BaseModel):
    sender: str  # "user" or "assistant"
    text: str

class ChatRequest(BaseModel):
    customer_id: int
    message: str
    history: List[ChatMessage] = []

# ── Tool wrappers ─────────────────────────────────────────────────────────────
def tool_get_claim_status(arguments: dict) -> str:
    claim_id = arguments.get("claim_id")
    if not claim_id:
        return "Error: Missing claim_id in arguments"
    try:
        details = get_claim_details(int(claim_id))
        if not details:
            return f"No claim found with ID #{claim_id}."
        return json.dumps(details, default=str)
    except Exception as e:
        return f"Error fetching claim status: {str(e)}"

def tool_get_customer_claims(arguments: dict) -> str:
    customer_id = arguments.get("customer_id")
    if not customer_id:
        return "Error: Missing customer_id in arguments"
    try:
        claims = get_customer_claims(int(customer_id))
        if not claims:
            return f"No claims found for Customer #{customer_id}."
        return json.dumps(claims, default=str)
    except Exception as e:
        return f"Error fetching customer claims: {str(e)}"

def tool_get_care_plan(arguments: dict) -> str:
    customer_id = arguments.get("customer_id")
    if not customer_id:
        return "Error: Missing customer_id in arguments"
    try:
        plan = get_patient_intervention(int(customer_id))
        if not plan:
            return f"No Health Guardian care plan found for Customer #{customer_id}."
        return json.dumps(plan, default=str)
    except Exception as e:
        return f"Error fetching care plan: {str(e)}"

def tool_get_customer_policies(arguments: dict) -> str:
    customer_id = arguments.get("customer_id")
    if not customer_id:
        return "Error: Missing customer_id in arguments"
    try:
        policies = get_customer_policies(int(customer_id))
        if not policies:
            return f"No active policies found for Customer #{customer_id}."
        return json.dumps(policies, default=str)
    except Exception as e:
        return f"Error fetching policies: {str(e)}"

async def tool_recommend_policy(arguments: dict) -> str:
    try:
        req = PolicyRecommendationRequest(
            age=int(arguments.get("age", 30)),
            family_size=int(arguments.get("family_size", 1)),
            budget=int(arguments.get("budget", 15000)),
            medical_history=str(arguments.get("medical_history", "None")),
            city=str(arguments.get("city", "Unknown"))
        )
        res = await recommend_policy(req)
        return json.dumps({
            "recommended_plan_id": res.recommended_plan_id,
            "recommended_plan_name": res.recommended_plan_name,
            "reasoning": res.reasoning,
            "confidence_score": res.confidence_score
        }, default=str)
    except Exception as e:
        return f"Error recommending policy: {str(e)}"

def tool_submit_claim_draft(arguments: dict) -> str:
    try:
        policy_id = int(arguments.get("policy_id"))
        hospital_id = int(arguments.get("hospital_id"))
        claim_amount = float(arguments.get("claim_amount"))
        disease = str(arguments.get("disease"))
        doctor_name = str(arguments.get("doctor_name"))
        description = str(arguments.get("description", ""))

        claim_id = submit_claim_draft(
            policy_id=policy_id,
            hospital_id=hospital_id,
            claim_amount=claim_amount,
            disease=disease,
            doctor_name=doctor_name,
            description=description
        )
        if not claim_id:
            return "Failed to submit claim draft."
        return f"Claim draft successfully submitted! Draft ID is #{claim_id}. Status: Pending. Our autonomous AI Claim Processor will process and audit this claim shortly."
    except Exception as e:
        return f"Failed to submit claim draft: {str(e)}"

# Map of tool names to their execution functions
TOOLS = {
    "get_claim_status": tool_get_claim_status,
    "get_customer_claims": tool_get_customer_claims,
    "get_care_plan": tool_get_care_plan,
    "get_customer_policies": tool_get_customer_policies,
    "recommend_policy": tool_recommend_policy,
    "submit_claim_draft": tool_submit_claim_draft,
}

SYSTEM_INSTRUCTIONS = """You are ClearClaim AI, a supportive, warm, and highly professional medical insurance assistant.
You help customers understand their policies, check claim statuses, find care plans, get policy recommendations, and draft claims.

You have access to the following TOOLS:
1. get_claim_status(claim_id: int) — Retrieve specific claim details.
2. get_customer_claims(customer_id: int) — Retrieve ALL claims for this customer, including their latest claim.
3. get_care_plan(customer_id: int) — Retrieve Health Guardian care plan / wellness tasks.
4. get_customer_policies(customer_id: int) — List all active insurance policies.
5. recommend_policy(age: int, family_size: int, budget: int, medical_history: str, city: str) — Get Gemini policy recommendation.
6. submit_claim_draft(policy_id: int, hospital_id: int, claim_amount: float, disease: str, doctor_name: str, description: str) — Submit a claim in natural language.

How to communicate:
- CRITICAL: Do NOT hallucinate data. If the user asks about their claims or policies, you MUST output a tool_call to fetch the real data first!
- CRITICAL: If they ask for their "latest claim", DO NOT ask for a claim ID. Call `get_customer_claims` immediately.
- Respond in Markdown. Be warm and empathetic.
- CRITICAL: Keep your response extremely concise and brief (under 2-3 sentences max). Do not generate long paragraphs as they are difficult to read in the chat widget.
- When referring to claims or transactions, mention that it's verified immutably on the X Layer blockchain.
- If you need to call a tool, output ONLY a JSON block matching this schema:
  {
    "tool_call": {
      "name": "tool_name",
      "arguments": { ... }
    }
  }
- If you do not need to call a tool and are ready to respond to the user, output ONLY a JSON block matching this schema:
  {
    "response": "Your markdown message to the user here."
  }

Keep the response inside a valid JSON object. Never write raw conversational text outside the JSON. Always double-quote strings and escape special characters.
"""

@router.post("/agent/chat")
async def chat_agent(request: ChatRequest):
    """
    FastAPI endpoint for the Conversational AI agent.
    Runs a tool-use loop with Gemini.
    """
    history_lines = []
    for msg in request.history:
        history_lines.append(f"{msg.sender.capitalize()}: {msg.text}")
    history_text = "\n".join(history_lines)

    # Core execution loop (up to 3 iterations)
    context = ""
    for _ in range(3):
        prompt = f"""{SYSTEM_INSTRUCTIONS}

--- CONTEXT (Current session info) ---
Customer ID: {request.customer_id}
{context}

--- CONVERSATION HISTORY ---
{history_text}
User: {request.message}

Decide on your next step. Output ONLY the JSON block:"""

        try:
            response = gemini_client.model.generate_content(prompt)
            text = response.text.strip()
            
            # Clean markdown code blocks if any
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
            text = text.strip()

            parsed = json.loads(text)

            if "tool_call" in parsed and parsed["tool_call"]:
                tool_name = parsed["tool_call"].get("name")
                arguments = parsed["tool_call"].get("arguments", {})

                # Automatically inject customer_id if missing and required by the tool
                if tool_name in ["get_care_plan", "get_customer_policies", "get_customer_claims"] and "customer_id" not in arguments:
                    arguments["customer_id"] = request.customer_id

                if tool_name in TOOLS:
                    tool_fn = TOOLS[tool_name]
                    # Check if tool is async
                    if tool_name == "recommend_policy":
                        tool_result = await tool_fn(arguments)
                    else:
                        tool_result = tool_fn(arguments)
                    
                    context += f"\n[Tool Result] {tool_name} returned: {tool_result}"
                    continue
                else:
                    context += f"\n[Tool Result] Error: Tool '{tool_name}' not found."
                    continue

            elif "response" in parsed:
                return {"response": parsed["response"]}

            else:
                return {"response": "I apologize, but I ran into a configuration error while formulating a response."}

        except json.JSONDecodeError:
            # Fallback to straight conversation if JSON parsing failed
            # Try once more requesting normal markdown text
            try:
                fallback_prompt = f"Format your response as a friendly conversation response directly. User: {request.message}"
                res = gemini_client.model.generate_content(fallback_prompt)
                return {"response": res.text}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return {"response": "I apologize, but I had trouble completing that operation in a timely manner. How else can I assist you?"}

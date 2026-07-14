"""
agents/main.py — ClearClaim AI Agent Gateway
Unified FastAPI app — all 11 agents on port 8000.

Agents:
  1. Claim Processor   — Gemini autonomous claim adjudication + SSE stream
  2. Fraud Detector    — Algorithmic 0-100 risk scoring
  3. Policy Advisor    — Gemini plan recommendation
  4. Orchestrator      — Central pipeline router (chains agents)
  5. Predictive Risk   — Nightly autonomous patient risk scanning
  6. Health Guardian   — Personalized 90-day preventive care plans
"""
import sys
import os
import logging

# Ensure agents/ folder is on the path for all shared imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# ── Import all agent routers ─────────────────────────────────────────────────
from claim_processor.router  import router as claim_router
from fraud_detector.router   import router as fraud_router
from policy_advisor.router   import router as policy_router
from mcp.router              import router as mcp_router
from orchestrator.router     import router as orchestrator_router
from predictive_risk.router  import router as predictive_router
from health_guardian.router import router as health_guardian_router
from hospital_assistant.router import router as hospital_assistant_router
from health_passport.router import router as health_passport_router
from chat_agent.router import router as chat_router
from plan_hospital.router import router as plan_hospital_router
from rlhf.router import router as rlhf_router
from orchestrator.graph_router import router as graph_router
from economics.router import router as economics_router
from observability.router import router as observability_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clearclaim.gateway")


# ── APScheduler: autonomous background tasks ────────────────────────────────
def _start_scheduler():
    """
    Starts APScheduler for autonomous background tasks.
    - Every 30 minutes: Auto-process all pending claims
    - Nightly at 02:00: Predictive Risk scan on all active customers
    """
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        import httpx

        scheduler = AsyncIOScheduler()

        async def auto_process_claims():
            logger.info("[Scheduler] Starting auto-processing of pending claims...")
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    res = await client.post("http://localhost:8000/agent/process-claims")
                    results = res.json()
                    approved = sum(1 for r in results if r.get("decision") == "Approve")
                    rejected = sum(1 for r in results if r.get("decision") == "Reject")
                    flagged = sum(1 for r in results if r.get("decision") == "Flag")
                    logger.info(
                        f"[Scheduler] Auto-claim processing complete: "
                        f"{len(results)} claims processed, "
                        f"{approved} approved, {rejected} rejected, {flagged} flagged."
                    )
            except Exception as e:
                logger.error(f"[Scheduler] Auto-claim processing failed: {e}")

        async def nightly_risk_scan():
            logger.info("[Scheduler] Starting nightly predictive risk scan...")
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    res = await client.get("http://localhost:8000/agent/predictive-scan")
                    results = res.json()
                    high_risk = sum(1 for r in results if r.get("risk_score", 0) >= 0.65)
                    logger.info(
                        f"[Scheduler] Nightly scan complete: {len(results)} customers scanned, "
                        f"{high_risk} high-risk flagged, Health Guardian triggered for {high_risk}."
                    )
            except Exception as e:
                logger.error(f"[Scheduler] Nightly scan failed: {e}")

        # Run auto-claim processing every 30 minutes
        scheduler.add_job(auto_process_claims, "interval", minutes=30, id="auto_process_claims")
        # Run every night at 02:00 AM
        scheduler.add_job(nightly_risk_scan, "cron", hour=2, minute=0, id="nightly_risk_scan")
        scheduler.start()
        logger.info(
            "[Scheduler] APScheduler started — auto-process claims every 30 mins, nightly risk scan at 02:00 AM"
        )
        return scheduler

    except ImportError:
        logger.warning(
            "[Scheduler] APScheduler not installed. "
            "Run: pip install apscheduler  to enable autonomous background tasks."
        )
        return None


# ── App lifecycle ─────────────────────────────────────────────────────────────
_scheduler = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler
    logger.info("ClearClaim AI Gateway starting up — 11 agents online")
    _scheduler = _start_scheduler()
    yield
    if _scheduler:
        _scheduler.shutdown()
    logger.info("ClearClaim AI Gateway shut down")


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="ClearClaim AI — Agent Service Provider",
    description=(
        "11-agent autonomous medical insurance platform. "
        "LangGraph-orchestrated, Gemini 3.5 Flash, onchain via X Layer (chainId 1952). "
        "Built for OKX.AI Genesis Hackathon 2026."
    ),
    version="3.0.0",
    lifespan=lifespan,
)

# CORS: allow local frontend + OKX.AI marketplace
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_origins=[
        "https://www.okx.ai",
        "https://okx.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount all routers ─────────────────────────────────────────────────────────
app.include_router(claim_router)       # Agent 1: /agent/process-claims
app.include_router(fraud_router)       # Agent 2: /agent/fraud-score/{id}
app.include_router(policy_router)      # Agent 3: /agent/recommend-policy
app.include_router(orchestrator_router) # Agent 4: /agent/orchestrate/*
app.include_router(predictive_router, tags=["Predictive Risk"])
app.include_router(health_guardian_router, tags=["Health Guardian"])
app.include_router(hospital_assistant_router, tags=["Hospital Assistant"])
app.include_router(health_passport_router, tags=["Health Passport"])
app.include_router(chat_router, tags=["Chat Agent"])
app.include_router(plan_hospital_router, tags=["Plan Hospital"])
app.include_router(rlhf_router, tags=["Self-Learning (RLHF)"])
app.include_router(graph_router, tags=["LangGraph Orchestrator"])   # /agent/graph/*
app.include_router(economics_router, tags=["Agent Economics"])      # /agent/economics/*
app.include_router(observability_router, tags=["Observability"])    # /agent/metrics, /agent/traces
app.include_router(mcp_router)         # OKX.AI:  /mcp/* + /.well-known/agent.json


# ── Root health check ─────────────────────────────────────────────────────────
@app.get("/agent/status")
def health_check():
    return {
        "status":   "online",
        "agent":    "ClearClaim AI",
        "version":  "3.0.0",
        "agents": {
            "1_claim_processor":     "POST /agent/process-claims (SSE: /agent/process-claims/stream)",
            "2_fraud_detector":      "GET  /agent/fraud-score/{claim_id}",
            "3_policy_advisor":      "POST /agent/recommend-policy",
            "4_orchestrator":        "POST /agent/orchestrate/claim/{claim_id}",
            "5_predictive_risk":     "GET  /agent/predictive-scan",
            "6_health_guardian":     "POST /agent/health-guardian/{customer_id}",
            "7_hospital_assistant":  "GET  /agent/hospital-assistant/{claim_id} | POST /agent/hospital-assistant/pre-auth",
            "8_health_passport":     "POST /agent/health-passport/mint | GET /agent/health-passport/{wallet}",
            "9_chat_agent":          "POST /agent/chat",
            "10_self_learning_rlhf": "POST /agent/rlhf/run | GET /agent/rlhf/rules",
            "11_langgraph_orchestrator": "POST /agent/graph/run/{claim_id} | GET /agent/graph/review-queue | POST /agent/graph/resume/{thread_id}",
        },
        "economics":  "GET /agent/economics/pnl | /leaderboard | /ledger",
        "observability": "GET /agent/metrics | GET /agent/traces/{claim_id} | GET /agent/graph/checkpoints/{claim_id}",
        "workflow_engine": "LangGraph 1.x — SQLite-checkpointed, human-in-the-loop, IRDAI rules gate",
        "mcp":        "GET /mcp/tools | POST /mcp/invoke | GET /.well-known/agent.json",
        "blockchain": "X Layer Testnet (chainId: 195)",
        "llm":        "gemini-3.5-flash",
        "scheduler":  "APScheduler — auto-process claims every 30 mins, nightly risk scan at 02:00 AM",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)




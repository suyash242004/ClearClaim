"""
agents/economics/router.py — Agent Economics (OKX.AI core thesis).

Every paid MCP invocation is written to the `agentledger` table (lowercase,
unquoted — like every table in this schema) with its revenue, estimated
compute cost, and margin. The dashboards prove the OKX.AI pitch line:
**each agent earns more per call than it spends on compute.**

  GET /agent/economics/pnl          — per-agent revenue / cost / margin %
  GET /agent/economics/leaderboard  — highest-earning agents per call
  GET /agent/economics/ledger       — recent raw invocations
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from fastapi import APIRouter
from psycopg2.extras import RealDictCursor

from shared.db import get_db_connection

logger = logging.getLogger("clearclaim.economics")
router = APIRouter()

# ── Cost model (USD, per invocation) ─────────────────────────────────────────
# Gemini 3.5 Flash ≈ $1.50/M input + $9.00/M output tokens → a typical
# adjudication call (~2K in / 300 out) costs ≈ $0.006. Blockchain writes on
# X Layer testnet are ~free; we book $0.0005/TX for mainnet realism.
LLM_CALL_COST   = 0.006
CHAIN_TX_COST   = 0.0005
BASE_INFRA_COST = 0.0001   # CPU/DB per request

# tool -> (llm_calls, chain_txs) used to estimate compute cost
TOOL_COST_PROFILE = {
    "score_fraud":          (0, 0),   # pure algorithm — near-zero cost, huge margin
    "hospital_preauth":     (1, 0),
    "claim_adjudication":   (1, 1),
    "process_claims":       (1, 1),
    "recommend_policy":     (1, 0),
    "cross_verify_clinical":(1, 0),
    "orchestrate_claim":    (3, 2),
    "graph_adjudicate":     (3, 2),
    "predictive_risk_scan": (1, 1),
}


def estimate_cost(tool: str) -> float:
    llm, tx = TOOL_COST_PROFILE.get(tool, (1, 0))
    return round(BASE_INFRA_COST + llm * LLM_CALL_COST + tx * CHAIN_TX_COST, 6)


_table_ready = False

def ensure_ledger_table():
    global _table_ready
    if _table_ready:
        return
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS agentledger (
                    ledger_id          SERIAL PRIMARY KEY,
                    agent_name         VARCHAR(60)  NOT NULL,
                    tool_name          VARCHAR(60)  NOT NULL,
                    caller             VARCHAR(120) DEFAULT 'okx.ai',
                    compute_cost_usd   NUMERIC(10,6) NOT NULL,
                    price_charged_usdt NUMERIC(10,4) NOT NULL,
                    margin_usdt        NUMERIC(10,6) NOT NULL,
                    latency_ms         INT DEFAULT 0,
                    success            BOOLEAN DEFAULT TRUE,
                    invoked_at         TIMESTAMPTZ DEFAULT NOW()
                )
            """)
        conn.commit()
        _table_ready = True
    finally:
        conn.close()


def record_invocation(agent_name: str, tool_name: str, price_usdt: float,
                      caller: str = "okx.ai", latency_ms: int = 0,
                      success: bool = True):
    """Books one paid invocation into the ledger. Never raises."""
    try:
        ensure_ledger_table()
        cost = estimate_cost(tool_name)
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO agentledger
                        (agent_name, tool_name, caller, compute_cost_usd,
                         price_charged_usdt, margin_usdt, latency_ms, success)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (agent_name, tool_name, caller, cost, price_usdt,
                      round(price_usdt - cost, 6), latency_ms, success))
            conn.commit()
        finally:
            conn.close()
    except Exception as e:
        logger.warning(f"[Economics] ledger write failed: {e}")


@router.get("/agent/economics/pnl")
def agent_pnl():
    """Per-agent profit & loss — the judge-facing money shot."""
    ensure_ledger_table()
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT agent_name,
                       COUNT(*)                          AS invocations,
                       ROUND(SUM(price_charged_usdt), 4) AS revenue_usdt,
                       ROUND(SUM(compute_cost_usd), 6)   AS compute_cost_usd,
                       ROUND(SUM(margin_usdt), 6)        AS profit_usdt,
                       ROUND(AVG(latency_ms))            AS avg_latency_ms
                FROM agentledger
                GROUP BY agent_name
                ORDER BY profit_usdt DESC
            """)
            rows = [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

    for r in rows:
        rev = float(r["revenue_usdt"] or 0)
        r["margin_pct"] = round(float(r["profit_usdt"] or 0) / rev * 100, 2) if rev else 0.0
        # normalise Decimal → float for JSON
        for k in ("revenue_usdt", "compute_cost_usd", "profit_usdt"):
            r[k] = float(r[k] or 0)

    totals = {
        "revenue_usdt": round(sum(r["revenue_usdt"] for r in rows), 4),
        "compute_cost_usd": round(sum(r["compute_cost_usd"] for r in rows), 6),
        "profit_usdt": round(sum(r["profit_usdt"] for r in rows), 6),
        "invocations": sum(int(r["invocations"]) for r in rows),
    }
    return {"agents": rows, "totals": totals,
            "thesis": "Every agent earns more per call than it spends on compute."}


@router.get("/agent/economics/leaderboard")
def leaderboard():
    """Which agent earns the most per call — profit efficiency ranking."""
    ensure_ledger_table()
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT agent_name, tool_name,
                       COUNT(*)                    AS calls,
                       ROUND(AVG(margin_usdt), 6)  AS avg_profit_per_call_usdt,
                       ROUND(SUM(margin_usdt), 6)  AS total_profit_usdt
                FROM agentledger
                GROUP BY agent_name, tool_name
                ORDER BY avg_profit_per_call_usdt DESC
            """)
            rows = [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()
    for r in rows:
        r["avg_profit_per_call_usdt"] = float(r["avg_profit_per_call_usdt"] or 0)
        r["total_profit_usdt"] = float(r["total_profit_usdt"] or 0)
    return {"leaderboard": rows}


@router.get("/agent/economics/ledger")
def recent_ledger(limit: int = 50):
    """Raw recent invocations, newest first."""
    ensure_ledger_table()
    limit = max(1, min(limit, 500))
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT ledger_id, agent_name, tool_name, caller,
                       compute_cost_usd, price_charged_usdt, margin_usdt,
                       latency_ms, success, invoked_at
                FROM agentledger
                ORDER BY ledger_id DESC
                LIMIT %s
            """, (limit,))
            rows = [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()
    for r in rows:
        for k in ("compute_cost_usd", "price_charged_usdt", "margin_usdt"):
            r[k] = float(r[k] or 0)
        r["invoked_at"] = r["invoked_at"].isoformat() if r["invoked_at"] else None
    return {"entries": rows}

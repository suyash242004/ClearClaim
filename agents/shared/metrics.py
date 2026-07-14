"""
agents/shared/metrics.py — In-process observability counters.

Thread-safe, zero-dependency. Every agent increments these; the gateway
exposes them at GET /agent/metrics and the Admin dashboard renders them
as a live strip.
"""
import threading
import time
from collections import defaultdict

_lock = threading.Lock()
_started_at = time.time()

_counters = defaultdict(int)          # name -> count
_latency_sum_ms = defaultdict(float)  # agent -> total ms
_latency_count = defaultdict(int)     # agent -> samples


def incr(name: str, by: int = 1):
    with _lock:
        _counters[name] += by


def observe_latency(agent: str, ms: float):
    with _lock:
        _latency_sum_ms[agent] += ms
        _latency_count[agent] += 1


def snapshot() -> dict:
    with _lock:
        avg_latency = {
            agent: round(_latency_sum_ms[agent] / _latency_count[agent], 1)
            for agent in _latency_count if _latency_count[agent] > 0
        }
        return {
            "uptime_seconds": int(time.time() - _started_at),
            "claims_processed": _counters.get("claims_processed", 0),
            "graph_runs": _counters.get("graph_runs", 0),
            "graph_human_pauses": _counters.get("graph_human_pauses", 0),
            "auto_rejects_rule_engine": _counters.get("auto_rejects_rule_engine", 0),
            "llm_calls": _counters.get("llm_calls", 0),
            "llm_fallbacks": _counters.get("llm_fallbacks", 0),
            "llm_tokens_estimated": _counters.get("llm_tokens_estimated", 0),
            "blockchain_tx_written": _counters.get("blockchain_tx_written", 0),
            "blockchain_tx_failed": _counters.get("blockchain_tx_failed", 0),
            "mcp_invocations": _counters.get("mcp_invocations", 0),
            "avg_latency_ms_by_agent": avg_latency,
        }

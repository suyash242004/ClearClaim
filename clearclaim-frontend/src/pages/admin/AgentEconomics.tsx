// AgentEconomics.tsx — Agent P&L dashboard (the OKX.AI thesis, live).
// Proves each agent earns more per call than it spends on compute:
// stat tiles for totals, a per-tool profit bar (single indigo series,
// bar-in-table so the huge revenue:cost scale gap stays honest), and a
// live metrics strip from /agent/metrics.
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Cpu, RefreshCw, Coins, Activity } from "lucide-react";
import {
  AgentHttpService,
  type PnlResponse,
  type LeaderboardEntry,
  type AgentMetrics,
} from "../../services/AgentHttpService";

const INDIGO = "#6366F1";

const usdt = (n: number, digits = 4) =>
  `$${Number(n).toFixed(digits).replace(/\.?0+$/, (m) => (m.startsWith(".") ? "" : m))}`;

function StatTile({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex-1 min-w-[150px]"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color: accent }} />
        <span className="text-xs font-medium" style={{ color: "#94A3B8" }}>{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-[11px] mt-1" style={{ color: "#64748B" }}>{sub}</p>}
    </div>
  );
}

export default function AgentEconomics() {
  const [pnl, setPnl] = useState<PnlResponse | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, l, m] = await Promise.all([
        AgentHttpService.getPnl(),
        AgentHttpService.getLeaderboard(),
        AgentHttpService.getMetrics(),
      ]);
      setPnl(p.data);
      setBoard(l.data.leaderboard);
      setMetrics(m.data);
    } catch {
      setError("Agent gateway unreachable — is the Python service on port 8000 running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const maxProfit = Math.max(...board.map((b) => b.total_profit_usdt), 0.0001);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Coins size={22} style={{ color: INDIGO }} />
            Agent Economics
          </h1>
          <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
            Live P&amp;L from the <code>agentledger</code> — every OKX.AI invocation books
            revenue (USDT), estimated compute cost, and margin.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-white/10"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#FCA5A5" }}>
          {error}
        </div>
      )}

      {/* Totals — stat tiles */}
      {pnl && (
        <div className="flex flex-wrap gap-3">
          <StatTile label="Revenue" value={usdt(pnl.totals.revenue_usdt, 2)} sub="USDT charged per-call"
            icon={TrendingUp} accent="#34D399" />
          <StatTile label="Compute cost" value={usdt(pnl.totals.compute_cost_usd)} sub="LLM + chain + infra estimate"
            icon={Cpu} accent="#F59E0B" />
          <StatTile label="Profit" value={usdt(pnl.totals.profit_usdt, 4)}
            sub={pnl.agents[0] ? `${pnl.agents[0].margin_pct.toFixed(1)}% margin` : undefined}
            icon={Coins} accent={INDIGO} />
          <StatTile label="Invocations" value={String(pnl.totals.invocations)} sub="paid MCP calls"
            icon={Activity} accent="#94A3B8" />
        </div>
      )}

      {/* Per-tool profit — bar-in-table (single series, direct values) */}
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <h2 className="text-sm font-semibold text-white mb-1">Profit by tool</h2>
        <p className="text-xs mb-4" style={{ color: "#64748B" }}>
          Revenue and cost differ by ~100×, so cost is shown as a value, not a bar.
        </p>

        {board.length === 0 && !loading && (
          <p className="text-sm" style={{ color: "#94A3B8" }}>
            No paid invocations yet. Call any tool via <code>POST /mcp/invoke</code> and the
            ledger fills in.
          </p>
        )}

        <div className="space-y-3">
          {board.map((b) => (
            <div key={`${b.agent_name}-${b.tool_name}`} className="grid items-center gap-3"
              style={{ gridTemplateColumns: "170px 1fr 180px" }}>
              <span className="text-xs font-medium truncate" style={{ color: "#CBD5E1" }}
                title={b.tool_name}>
                {b.tool_name}
              </span>
              <div className="h-4 rounded relative" style={{ background: "rgba(255,255,255,0.04)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max((b.total_profit_usdt / maxProfit) * 100, 2)}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full"
                  style={{ background: INDIGO, borderRadius: "2px 4px 4px 2px" }}
                  title={`${b.tool_name}: ${usdt(b.total_profit_usdt)} total profit over ${b.calls} call(s)`}
                />
              </div>
              <span className="text-[11px] font-mono text-right" style={{ color: "#94A3B8" }}>
                {usdt(b.total_profit_usdt)} · {b.calls}×
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full font-sans font-semibold"
                  style={{ background: "rgba(16,185,129,0.12)", color: "#34D399" }}>
                  +{usdt(b.avg_profit_per_call_usdt)}/call
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Live agent metrics strip */}
      {metrics && (
        <div className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-sm font-semibold text-white mb-4">Live agent metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              ["Claims processed", metrics.claims_processed],
              ["Graph runs", metrics.graph_runs],
              ["Human pauses", metrics.graph_human_pauses],
              ["Rule auto-rejects", metrics.auto_rejects_rule_engine],
              ["LLM calls", metrics.llm_calls],
              ["Onchain TXs", metrics.blockchain_tx_written],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-lg font-bold text-white">{value as number}</p>
                <p className="text-[11px]" style={{ color: "#64748B" }}>{label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-4" style={{ color: "#475569" }}>
            Uptime {Math.floor(metrics.uptime_seconds / 60)} min · {metrics.llm_fallbacks} LLM
            fallback(s) · ~{metrics.llm_tokens_estimated.toLocaleString()} tokens ·{" "}
            {metrics.mcp_invocations} MCP invocation(s)
          </p>
        </div>
      )}
    </div>
  );
}

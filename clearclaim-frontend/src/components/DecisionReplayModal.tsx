// DecisionReplayModal.tsx — "flight recorder" replay of an AI claim decision.
// Renders the LangGraph audit trail step by step with timestamps, falling back
// to the claim row's AI columns for claims decided by the legacy pipeline.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, History, GitBranch, PauseCircle } from "lucide-react";
import { AgentHttpService } from "../services/AgentHttpService";

interface Props {
  claimId: number;
  onClose: () => void;
}

interface Trace {
  claim_id: number;
  disease?: string;
  claim_amount?: number;
  status?: string;
  ai_decision?: string | null;
  ai_reasoning?: string | null;
  ai_confidence?: number;
  fraud_score?: number | null;
  tx_hash?: string | null;
  source: string;
  audit_trail: string[];
  is_paused?: boolean;
  total_checkpoints?: number;
}

const decisionColor = (d?: string | null) =>
  d === "Approve" ? "#34D399" : d === "Reject" ? "#F87171" : "#FBBF24";

export default function DecisionReplayModal({ claimId, onClose }: Props) {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AgentHttpService.getTrace(claimId)
      .then((res) => setTrace(res.data))
      .catch(() => setError("Could not load the decision trace for this claim."));
  }, [claimId]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6"
          style={{ background: "#0B0F1A", border: "1px solid rgba(99,102,241,0.25)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={18} style={{ color: "#6366F1" }} />
                Decision Replay — Claim #{claimId}
              </h2>
              {trace && (
                <p className="text-xs mt-1" style={{ color: "#64748B" }}>
                  {trace.disease} · ₹{Number(trace.claim_amount ?? 0).toLocaleString("en-IN")} ·{" "}
                  {trace.source === "langgraph_checkpoints"
                    ? `${trace.total_checkpoints ?? 0} checkpoints (LangGraph)`
                    : "legacy pipeline (claims table)"}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
              <X size={16} style={{ color: "#94A3B8" }} />
            </button>
          </div>

          {error && <p className="text-sm" style={{ color: "#F87171" }}>{error}</p>}
          {!trace && !error && (
            <p className="text-sm animate-pulse" style={{ color: "#94A3B8" }}>
              Loading flight recorder…
            </p>
          )}

          {trace && (
            <>
              {/* Verdict strip */}
              <div
                className="rounded-xl px-4 py-3 mb-5 flex flex-wrap items-center gap-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span
                  className="text-sm font-bold px-2.5 py-1 rounded-full"
                  style={{
                    color: decisionColor(trace.ai_decision),
                    background: `${decisionColor(trace.ai_decision)}1f`,
                  }}
                >
                  {trace.ai_decision ?? "Undecided"}
                </span>
                {trace.ai_confidence != null && (
                  <span className="text-xs" style={{ color: "#94A3B8" }}>
                    confidence {(Number(trace.ai_confidence) * 100).toFixed(0)}%
                  </span>
                )}
                {trace.fraud_score != null && (
                  <span className="text-xs" style={{ color: "#94A3B8" }}>
                    fraud {trace.fraud_score}/100
                  </span>
                )}
                {trace.is_paused && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#FBBF24" }}>
                    <PauseCircle size={12} /> awaiting human review
                  </span>
                )}
                {trace.tx_hash && (
                  <a
                    href={`https://www.oklink.com/xlayer-test/tx/${trace.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline"
                    style={{ color: "#A5B4FC" }}
                  >
                    onchain proof ↗
                  </a>
                )}
              </div>

              {/* Audit trail timeline */}
              {trace.audit_trail.length > 0 ? (
                <ol className="relative space-y-0">
                  {trace.audit_trail.map((entry, i) => {
                    const m = entry.match(/^\[(.+?)\]\s*(.*)$/);
                    const ts = m?.[1] ?? "";
                    const text = m?.[2] ?? entry;
                    return (
                      <li key={i} className="relative pl-6 pb-4">
                        {/* Timeline rail */}
                        {i < trace.audit_trail.length - 1 && (
                          <span
                            className="absolute left-[7px] top-4 bottom-0 w-px"
                            style={{ background: "rgba(99,102,241,0.25)" }}
                          />
                        )}
                        <span
                          className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full flex items-center justify-center"
                          style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)" }}
                        >
                          <GitBranch size={8} style={{ color: "#A5B4FC" }} />
                        </span>
                        <p className="text-[11px] font-mono" style={{ color: "#64748B" }}>
                          {ts.replace("T", " ")}
                        </p>
                        <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "#CBD5E1" }}>
                          {text}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div>
                  <p className="text-sm" style={{ color: "#94A3B8" }}>
                    No graph audit trail — this claim was decided by the legacy pipeline.
                  </p>
                  {trace.ai_reasoning && (
                    <p
                      className="text-sm mt-3 rounded-xl px-4 py-3 leading-relaxed"
                      style={{ background: "rgba(255,255,255,0.03)", color: "#CBD5E1" }}
                    >
                      {trace.ai_reasoning}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

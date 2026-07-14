// ReviewQueue.tsx — Human-in-the-loop queue for the LangGraph orchestrator.
// Shows claims paused at the graph's human_checkpoint (low confidence /
// high fraud / high value). Approve or Reject resumes the graph from the
// exact node it paused on — it then records onchain and persists autonomously.
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, CheckCircle2, XCircle, RefreshCw, PauseCircle, History,
} from "lucide-react";
import {
  AgentHttpService,
  type ReviewQueueItem,
} from "../../services/AgentHttpService";
import DecisionReplayModal from "../../components/DecisionReplayModal";

const fmtINR = (n?: number | null) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`;

export default function ReviewQueue() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null); // thread_id in flight
  const [toast, setToast] = useState<string | null>(null);
  const [gatewayDown, setGatewayDown] = useState(false);
  const [replayClaim, setReplayClaim] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AgentHttpService.getReviewQueue();
      setQueue(res.data.queue);
      setGatewayDown(false);
    } catch {
      setGatewayDown(true);
      setToast("Agent gateway unreachable — is the Python service on port 8000 running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (item: ReviewQueueItem, decision: "Approve" | "Reject") => {
    setActing(item.thread_id);
    try {
      const res = await AgentHttpService.resumeGraph(item.thread_id, decision);
      setToast(
        `Claim #${item.claim_id} ${decision.toLowerCase()}d — graph resumed and completed` +
          (res.data.tx_hash ? ` (onchain: ${res.data.tx_hash.slice(0, 14)}…)` : "")
      );
      setQueue((q) => q.filter((x) => x.thread_id !== item.thread_id));
    } catch (e: any) {
      setToast(e?.response?.data?.detail ?? "Resume failed — see agent logs");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <PauseCircle size={22} style={{ color: "#F59E0B" }} />
            Human Review Queue
          </h1>
          <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
            Claims where the LangGraph pipeline paused — low AI confidence, elevated
            fraud, or high value. Your decision resumes the graph from that exact node.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {toast && (
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)", color: "#C7D2FE" }}
        >
          {toast}
        </div>
      )}

      {/* Queue */}
      {!loading && !gatewayDown && queue.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: "#34D399" }} />
          <p className="text-white font-semibold">Queue is clear</p>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>
            Every claim the AI wasn't sure about has been reviewed. The agents are
            handling the rest autonomously. To feed this queue, run the LangGraph
            pipeline (branch icon) on a pending claim in the Claims page.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {queue.map((item) => (
          <motion.div
            key={item.thread_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-white font-semibold">Claim #{item.claim_id}</span>
                  <span className="text-sm" style={{ color: "#94A3B8" }}>{item.disease ?? "—"}</span>
                  <span className="text-sm font-medium text-white">{fmtINR(item.claim_amount)}</span>
                  {item.fraud_score != null && (
                    <span
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: item.fraud_score >= 60 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                        color: item.fraud_score >= 60 ? "#F87171" : "#FBBF24",
                      }}
                    >
                      <ShieldAlert size={11} /> Fraud {item.fraud_score}/100
                    </span>
                  )}
                  {item.confidence != null && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(99,102,241,0.12)", color: "#A5B4FC" }}
                    >
                      AI confidence {(item.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: "#94A3B8" }}>
                  <span className="font-medium" style={{ color: "#C7D2FE" }}>
                    AI suggests {item.ai_decision ?? "review"}:
                  </span>{" "}
                  {item.ai_reasoning ?? "No reasoning recorded."}
                </p>
                {item.payable_amount != null && (
                  <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>
                    IRDAI rules-engine payable: {fmtINR(item.payable_amount)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setReplayClaim(item.claim_id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8" }}
                >
                  <History size={13} /> Replay
                </button>
                <button
                  disabled={acting === item.thread_id}
                  onClick={() => resolve(item, "Reject")}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171" }}
                >
                  <XCircle size={13} /> Reject
                </button>
                <button
                  disabled={acting === item.thread_id}
                  onClick={() => resolve(item, "Approve")}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#34D399" }}
                >
                  {acting === item.thread_id ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={13} />
                  )}
                  Approve
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {replayClaim != null && (
        <DecisionReplayModal claimId={replayClaim} onClose={() => setReplayClaim(null)} />
      )}
    </div>
  );
}

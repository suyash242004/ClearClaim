// PendingClaims.tsx — Full dark table with AI reasoning drawer + floating FAB
import { Fragment, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { readApi, writeApi } from "../../services/axiosConfig";
import { AgentHttpService, type ClaimDecision } from "../../services/AgentHttpService";
import ClaimStatusChip from "../../components/ClaimStatusChip";
import FraudScoreBadge from "../../components/FraudScoreBadge";
import TxHashLink from "../../components/TxHashLink";
import GhastButton from "../../components/GhastButton";
import {
  Bot, ChevronDown, ChevronUp, Check, X,
  AlertTriangle, Brain, Shield, RefreshCw, Play, History, GitBranch
} from "lucide-react";
import DecisionReplayModal from "../../components/DecisionReplayModal";

interface Claim {
  claimId: number;
  policyId: number;
  hospitalId: number;
  claimDate: string;
  claimAmount: number;
  disease: string;
  status: string;
  doctorName: string;
  description: string;
  fraudScore?: number | null;
  aiDecision?: string | null;
  aiReasoning?: string | null;
  aiConfidence?: number | null;
  txHash?: string | null;
}

export default function PendingClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResults, setAgentResults] = useState<Record<number, ClaimDecision>>({});
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [loadError, setLoadError] = useState("");
  const [replayClaim, setReplayClaim] = useState<number | null>(null);
  const [graphRunning, setGraphRunning] = useState<number | null>(null);

  const runGraphOnClaim = async (claimId: number) => {
    setGraphRunning(claimId);
    try {
      const { data } = await AgentHttpService.runGraph(claimId);
      setSuccessMsg(
        data.is_paused
          ? `Claim #${claimId} paused for human review — see the Review Queue.`
          : `LangGraph decided: ${data.ai_decision} (${Math.round((data.confidence ?? 0) * 100)}% confidence).`
      );
      await load();
    } catch {
      setSuccessMsg(`LangGraph run failed for claim #${claimId} — is the agent gateway running?`);
    } finally {
      setGraphRunning(null);
    }
  };

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      // Use with-ai endpoint to get persisted AI columns (fraud_score, ai_decision, tx_hash)
      // Falls back to pending-only if the endpoint is unavailable
      const res = await readApi.get("/api/admin/claims/with-ai").catch(
        () => readApi.get("/api/admin/claims/pending")
      );
      setClaims(res.data?.records ?? []);
    } catch {
      setClaims([]);
      setLoadError("Could not load claims — is the ReadAPI running on port 5234?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runAgent = async () => {
    setAgentRunning(true);
    try {
      const { data } = await AgentHttpService.processClaims();
      const map: Record<number, ClaimDecision> = {};
      data.forEach(d => { map[d.claim_id] = d; });
      setAgentResults(map);
      
      const approvedCount = data.filter(d => d.decision === "Approve").length;
      const rejectedCount = data.filter(d => d.decision === "Reject").length;
      setSuccessMsg(`AI processed ${data.length} claims (Approved: ${approvedCount}, Rejected: ${rejectedCount}). Check Admin Dashboard for detailed logs.`);
      
      await load();
    } catch {
      setSuccessMsg("AI agent unreachable — is the Python agent gateway running on port 8000?");
    } finally {
      setAgentRunning(false);
    }
  };

  const manualAction = async (claimId: number, action: "approve" | "reject") => {
    setActionLoading(claimId);
    try {
      await writeApi.put(`/api/admin/claims/${action}/${claimId}`);
      setSuccessMsg(`Claim #${claimId} ${action === "approve" ? "approved" : "rejected"} successfully.`);
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.errorMessage ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        `Failed to ${action} claim #${claimId}. Please try again.`;
      setSuccessMsg(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const getDecision = (claim: Claim): ClaimDecision | null =>
    agentResults[claim.claimId] ?? null;

  // Merged AI decision: runtime result takes precedence, then DB value
  const getAiDecision = (claim: Claim) => {
    const rt = agentResults[claim.claimId];
    return rt ? rt.decision : (claim.aiDecision ?? null);
  };

  const getAiReasoning = (claim: Claim) => {
    const rt = agentResults[claim.claimId];
    return rt ? rt.reasoning : (claim.aiReasoning ?? null);
  };

  const getConfidence = (claim: Claim) => {
    const rt = agentResults[claim.claimId];
    return rt ? rt.confidence_score : (claim.aiConfidence ? Number(claim.aiConfidence) : null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: "#F8FAFC" }}>Pending Claims</h1>
          <p className="text-sm mt-0.5" style={{ color: "#475569" }}>
            {claims.filter(c => c.status === "Pending").length} awaiting review · {claims.length} total
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-ghost flex items-center gap-1.5 text-xs"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="hover:text-emerald-300">
            <X size={14} />
          </button>
        </div>
      )}

      {loadError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={load} className="text-xs font-semibold hover:text-red-300 underline">
            Retry
          </button>
        </div>
      )}

      {/* ── Table card ── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <span className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin inline-block" />
            <p className="text-sm mt-3" style={{ color: "#475569" }}>Loading claims…</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="p-16 text-center">
            <Check size={32} style={{ color: "#34D399" }} className="mx-auto mb-3" />
            <p className="font-medium" style={{ color: "#F8FAFC" }}>No pending claims</p>
            <p className="text-sm mt-1" style={{ color: "#475569" }}>All claims have been processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark w-full">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Disease</th>
                  <th className="text-right">Amount</th>
                  <th>Policy</th>
                  <th>Fraud Score</th>
                  <th>AI Decision</th>
                  <th>Status</th>
                  <th>Tx Hash</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(claim => {
                  const decision = getDecision(claim);
                  const aiDec    = getAiDecision(claim);
                  const isOpen   = expanded === claim.claimId;
                  const conf     = getConfidence(claim);
                  const confPct  = conf != null ? Math.round(conf * 100) : null;

                  return (
                    <Fragment key={claim.claimId}>
                      <tr
                        className="cursor-pointer group"
                        onClick={() => setExpanded(isOpen ? null : claim.claimId)}
                        style={{ height: "48px" }}
                      >
                        {/* Claim ID */}
                        <td className="relative">
                          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="font-mono font-bold text-sm ml-2" style={{ color: "#6366F1" }}>
                            #{claim.claimId}
                          </span>
                        </td>

                        {/* Disease */}
                        <td>
                          <span className="font-medium text-xs" style={{ color: "#F8FAFC" }}>
                            {claim.disease}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="text-right">
                          <span className="font-bold text-sm" style={{ color: "#fff" }}>
                            ₹{Number(claim.claimAmount).toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Policy */}
                        <td>
                          <span className="text-xs font-mono" style={{ color: "#475569" }}>
                            P-{claim.policyId}
                          </span>
                        </td>

                        {/* Fraud Score */}
                        <td>
                          <FraudScoreBadge score={claim.fraudScore} />
                        </td>

                        {/* AI Decision */}
                        <td>
                          {aiDec
                            ? <ClaimStatusChip status={aiDec} />
                            : <span className="text-xs" style={{ color: "#1E293B" }}>—</span>
                          }
                        </td>

                        {/* DB Status */}
                        <td>
                          <ClaimStatusChip status={claim.status} />
                        </td>

                        {/* Tx Hash */}
                        <td onClick={e => e.stopPropagation()}>
                          <TxHashLink hash={claim.txHash} />
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => runGraphOnClaim(claim.claimId)}
                              disabled={graphRunning === claim.claimId}
                              className="px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 hover:brightness-125 disabled:opacity-60"
                              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}
                              title="Run the checkpointed LangGraph adjudication pipeline on this claim"
                              aria-label={`Run LangGraph pipeline on claim ${claim.claimId}`}
                            >
                              {graphRunning === claim.claimId
                                ? <RefreshCw size={12} className="animate-spin" style={{ color: "#A5B4FC" }} />
                                : <GitBranch size={12} style={{ color: "#A5B4FC" }} />
                              }
                              <span className="text-[10px] font-semibold" style={{ color: "#A5B4FC" }}>
                                {graphRunning === claim.claimId ? "Running…" : "Graph"}
                              </span>
                            </button>
                            <button
                              onClick={() => setReplayClaim(claim.claimId)}
                              className="px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 hover:brightness-125"
                              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                              title="Replay the AI decision step-by-step (flight recorder)"
                              aria-label={`Replay AI decision for claim ${claim.claimId}`}
                            >
                              <History size={12} style={{ color: "#94A3B8" }} />
                              <span className="text-[10px] font-semibold" style={{ color: "#94A3B8" }}>Replay</span>
                            </button>
                            <button
                              onClick={() => manualAction(claim.claimId, "approve")}
                              disabled={actionLoading === claim.claimId}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                              title="Approve"
                            >
                              <Check size={12} style={{ color: "#34D399" }} />
                            </button>
                            <button
                              onClick={() => manualAction(claim.claimId, "reject")}
                              disabled={actionLoading === claim.claimId}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                              title="Reject"
                            >
                              <X size={12} style={{ color: "#F87171" }} />
                            </button>
                            {isOpen
                              ? <ChevronUp  size={13} style={{ color: "#475569" }} />
                              : <ChevronDown size={13} style={{ color: "#475569" }} />
                            }
                          </div>
                        </td>
                      </tr>

                      {/* ── Expandable AI reasoning drawer ── */}
                      <AnimatePresence>
                        {isOpen && (
                          <tr key={`${claim.claimId}-detail`}>
                            <td colSpan={9} style={{ padding: 0 }}>
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22 }}
                                className="overflow-hidden"
                              >
                                <div
                                  className="m-3 p-5 rounded-xl space-y-4"
                                  style={{
                                    background: "#020408",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                  }}
                                >
                                  {/* Claim description */}
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#334155" }}>
                                      Claim Description
                                    </p>
                                    <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                                      {claim.description || "No description provided."}
                                    </p>
                                  </div>

                                    {getAiReasoning(claim) && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <Brain size={13} style={{ color: "#6366F1" }} />
                                          <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "#64748B" }}>
                                            AI Reasoning
                                          </p>
                                          {confPct != null && (
                                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.12)", color: "#6366F1" }}>
                                              {confPct}% confident
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-sm leading-relaxed mb-4" style={{ color: "#888899" }}>
                                          {getAiReasoning(claim)}
                                        </p>
                                        {/* Confidence bar */}
                                        {confPct != null && (
                                          <div className="space-y-1.5 max-w-md">
                                            <div className="flex justify-between text-xs font-medium uppercase tracking-wider" style={{ color: "#64748B" }}>
                                              <span>Confidence</span>
                                              <span>{confPct}%</span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full" style={{ background: "#222" }}>
                                              <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${confPct}%` }}
                                                transition={{ duration: 0.6, ease: "easeOut" }}
                                                className="h-full rounded-full"
                                                style={{ background: "#6366F1" }}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                  {/* Fraud indicators */}
                                  {decision && decision.fraud_indicators.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle size={13} style={{ color: "#FBBF24" }} />
                                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#334155" }}>
                                          Fraud Indicators
                                        </p>
                                      </div>
                                      <div className="space-y-1.5">
                                        {decision.fraud_indicators.map((ind, i) => (
                                          <div key={i} className="flex items-start gap-2">
                                            <span className="text-xs mt-0.5" style={{ color: "#F87171" }}>⚠</span>
                                            <span className="text-xs" style={{ color: "#FBBF24" }}>{ind}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Blockchain proof */}
                                  {claim.txHash && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <Shield size={13} style={{ color: "#10B981" }} />
                                        <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "#64748B" }}>
                                          Blockchain Proof
                                        </p>
                                      </div>
                                      <a
                                        href={`https://www.okx.com/web3/explorer/xlayer/test/tx/${claim.txHash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-medium hover:underline inline-flex items-center gap-1"
                                        style={{ color: "#10B981" }}
                                      >
                                        verify on chain ✓
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Floating Run AI Agent FAB ── */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
        className="fixed bottom-8 right-8 z-40"
      >
        <GhastButton
          onClick={runAgent}
          disabled={agentRunning}
          variant="light"
          className="shadow-2xl px-6 py-3.5 text-base gap-3"
        >
          {agentRunning ? (
            <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <Play size={16} fill="currentColor" />
          )}
          {agentRunning ? "AI Running…" : "Run AI Agent"}
        </GhastButton>
      </motion.div>

      {replayClaim != null && (
        <DecisionReplayModal claimId={replayClaim} onClose={() => setReplayClaim(null)} />
      )}
    </motion.div>
  );
}

// AdminDashboard.tsx — AI agent control center
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { readApi } from "../../services/axiosConfig";
import { AgentHttpService, type ClaimDecision, type SSEEvent, type RiskScanResult } from "../../services/AgentHttpService";
import StatCard from "../../components/StatCard";
import AgentStatusPanel, {
  type LogEntry, createLog,
} from "../../components/AgentStatusPanel";
import TerminalWindow from "../../components/TerminalWindow";
import GhastButton from "../../components/GhastButton";
import ClaimStatusChip from "../../components/ClaimStatusChip";
import FraudScoreBadge from "../../components/FraudScoreBadge";
import {
  FileText, Clock, CheckCircle, XCircle,
  Bot, AlertTriangle, RotateCcw, Sparkles, Zap, ShieldAlert, HeartPulse
} from "lucide-react";

interface DashboardStats {
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
}

interface PendingClaim {
  claimId: number;
  disease: string;
  claimAmount: number;
  fraudScore?: number;
  aiDecision?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClaims: 0, pendingClaims: 0, approvedClaims: 0, rejectedClaims: 0,
  });
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentResults, setAgentResults] = useState<Record<number, ClaimDecision>>({});
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [scanResults, setScanResults] = useState<RiskScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [orchestratingClaim, setOrchestratingClaim] = useState<number | null>(null);
  const sseCleanup = useRef<(() => void) | null>(null);
  const logIdRef = useRef(0);

  // Close any live SSE stream when the admin navigates away (no leaked connections)
  useEffect(() => {
    return () => {
      if (sseCleanup.current) {
        sseCleanup.current();
        sseCleanup.current = null;
      }
    };
  }, []);

  const addLog = (msg: string, type: LogEntry["type"]) =>
    setLogs(prev => [...prev, createLog(++logIdRef.current, msg, type)]);

  const loadData = async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const [dashRes, pendRes] = await Promise.all([
        readApi.get("/api/admin/dashboard"),
        readApi.get("/api/admin/claims/pending"),
      ]);
      const d = dashRes.data?.record;
      if (d) {
        setStats({
          // API sends the three status counts — total is their sum
          totalClaims: d.totalClaims ??
            ((d.pendingClaims ?? 0) + (d.approvedClaims ?? 0) + (d.rejectedClaims ?? 0)),
          pendingClaims: d.pendingClaims ?? 0,
          approvedClaims: d.approvedClaims ?? 0,
          rejectedClaims: d.rejectedClaims ?? 0,
        });
      }
      const pendClaims = pendRes.data?.records ?? [];

      // Batch-fetch fraud scores if they are missing
      const claimsWithoutScores = pendClaims.filter((c: PendingClaim) => c.fraudScore == null);
      if (claimsWithoutScores.length > 0) {
        await Promise.allSettled(
          claimsWithoutScores.map(async (c: PendingClaim) => {
            try {
              const fRes = await AgentHttpService.getFraudScore(c.claimId);
              if (fRes.data) {
                c.fraudScore = fRes.data.score;
              }
            } catch (e) {
              // Ignore failure for individual scores
            }
          })
        );
      }
      setPendingClaims(pendClaims);
    } catch (e) {
      // Zeros without context are misleading — surface that the data API is down
      console.error("Dashboard load error", e);
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const runPredictiveScan = async () => {
    setIsScanning(true);
    addLog("Starting Nightly Predictive Risk Scan (Agent 5)...", "info");
    try {
      const res = await AgentHttpService.getPredictiveScan();
      if (res.data) {
        setScanResults(res.data);
        addLog(`Scanned ${res.data.length} active patients. High-risk patients auto-assigned Health Guardian.`, "success");
      }
    } catch (e) {
      addLog("Predictive Risk Scan failed.", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const orchestrateClaim = async (claimId: number) => {
    setOrchestratingClaim(claimId);
    addLog(`Initiating Smart Orchestrator for Claim #${claimId}...`, "info");
    try {
      const res = await AgentHttpService.orchestrateClaim(claimId);
      if (res.data) {
        const r = res.data;
        // Print steps to terminal with slight delay
        r.pipeline_steps.forEach((step, idx) => {
          setTimeout(() => addLog(step, "processing"), idx * 250);
        });
        
        // Update local state after steps print
        setTimeout(() => {
          const decision = (r.ai_decision as any) || (r.fast_reject ? "Reject" : "Flag");
          setAgentResults(prev => ({
            ...prev,
            [claimId]: {
              claim_id: claimId,
              decision,
              reasoning: r.ai_reasoning || "",
              confidence_score: r.confidence_score || 0,
              fraud_indicators: [],
              tx_hash: r.tx_hash,
            }
          }));
          addLog(`Pipeline complete. Final Decision: ${decision}`, decision === "Approve" ? "success" : "warning");
        }, r.pipeline_steps.length * 250);
      }
    } catch (e) {
      addLog(`Failed to orchestrate claim #${claimId}`, "error");
    } finally {
      setOrchestratingClaim(null);
    }
  };

  const runAIAgent = () => {
    // Cancel any existing stream
    if (sseCleanup.current) { sseCleanup.current(); sseCleanup.current = null; }

    setIsAgentRunning(true);
    setLogs([]);
    addLog("Initializing ClearClaim AI Agent v3.0…", "info");
    addLog(`Connecting to Gemini 3.5 Flash via SSE stream…`, "info");

    const cleanup = AgentHttpService.streamProcessClaims(
      // Per-event handler
      (event: SSEEvent) => {
        if (event.type === "start") {
          addLog(event.message ?? "Starting…", "info");
        } else if (event.type === "processing") {
          addLog(event.message ?? `Analyzing claim #${event.claim_id}…`, "processing");
        } else if (event.type === "result" && event.claim_id != null) {
          const logType = event.decision === "Approve" ? "success"
                        : event.decision === "Reject"  ? "error"
                        : "warning";
          addLog(event.message ?? `Claim #${event.claim_id}: ${event.decision}`, logType);
          // Merge into results map
          setAgentResults(prev => ({
            ...prev,
            [event.claim_id!]: {
              claim_id: event.claim_id!,
              decision: event.decision as ClaimDecision["decision"],
              reasoning: event.reasoning ?? "",
              confidence_score: event.confidence_score ?? 0,
              fraud_indicators: event.fraud_indicators ?? [],
              tx_hash: event.tx_hash ?? null,
            },
          }));
        }
      },
      // On complete
      async () => {
        addLog("All decisions written to database.", "success");
        addLog("Blockchain tx hashes recorded on X Layer ⛓️", "success");
        setLastRun(new Date().toLocaleTimeString("en-US", { hour12: false }));
        setIsAgentRunning(false);
        sseCleanup.current = null;
        // Reload stats
        try {
          const dashRes = await readApi.get("/api/admin/dashboard");
          const d = dashRes.data?.record;
          if (d) setStats({
            totalClaims: d.totalClaims ??
              ((d.pendingClaims ?? 0) + (d.approvedClaims ?? 0) + (d.rejectedClaims ?? 0)),
            pendingClaims:  d.pendingClaims ?? 0,
            approvedClaims: d.approvedClaims ?? 0,
            rejectedClaims: d.rejectedClaims ?? 0,
          });
          await loadData();
        } catch { /* stats reload is best-effort */ }
      },
      // On error
      (err: string) => {
        addLog(`Agent error: ${err}`, "error");
        addLog("Make sure Python agent is running: cd agents && python main.py", "warning");
        setIsAgentRunning(false);
        sseCleanup.current = null;
      }
    );

    sseCleanup.current = cleanup;
  };

  const summaryTiles = Object.keys(agentResults).length > 0 ? [
    { label: "Approved",  count: Object.values(agentResults).filter(r => r.decision === "Approve").length, color: "#34D399" },
    { label: "Rejected",  count: Object.values(agentResults).filter(r => r.decision === "Reject").length,  color: "#F87171" },
    { label: "Flagged",   count: Object.values(agentResults).filter(r => r.decision === "Flag").length,    color: "#FBBF24" },
  ] : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* ── Data-API error banner — stats showing 0 without this is misleading ── */}
      {statsError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span>Could not load claim data — is the ReadAPI running on port 5234?</span>
          <button onClick={loadData} className="text-xs font-semibold underline hover:text-red-300">
            Retry
          </button>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#F8FAFC" }}>
            Control Center
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "#888899" }}>
            Autonomous AI claim adjudication dashboard
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadData}
            disabled={statsLoading}
            className="btn-ghost flex items-center gap-1.5 text-xs"
          >
            <RotateCcw size={12} className={statsLoading ? "animate-spin" : ""} />
            Refresh
          </button>

          <GhastButton
            onClick={runAIAgent}
            disabled={isAgentRunning}
            variant="light"
            className="text-sm gap-2"
          >
            {isAgentRunning ? (
              <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Bot size={15} />
            )}
            {isAgentRunning ? "AI Running…" : "Run AI Agent"}
          </GhastButton>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="flex items-center gap-3 mb-6 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <button
          onClick={runPredictiveScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818CF8", border: "1px solid rgba(99, 102, 241, 0.3)" }}
        >
          {isScanning ? <span className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" /> : <ShieldAlert size={16} />}
          Run Predictive Risk Scan
        </button>
        <span className="text-xs" style={{ color: "#64748B" }}>
          (Agent 5: Autonomous Nightly Radar)
        </span>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Claims"  value={stats.totalClaims}    icon={FileText}     color="#60A5FA" delay={0}   />
        <StatCard label="Pending"       value={stats.pendingClaims}  icon={Clock}        color="#FBBF24" delay={0.08}/>
        <StatCard label="Approved"      value={stats.approvedClaims} icon={CheckCircle}  color="#34D399" delay={0.16}/>
        <StatCard label="Rejected"      value={stats.rejectedClaims} icon={XCircle}      color="#F87171" delay={0.24}/>
      </div>

      {/* ── Main two-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* Terminal col — 3/5 */}
        <div className="xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: "#F8FAFC" }}>
                AI Terminal
              </span>
              {isAgentRunning && (
                <span
                  className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse"
                  style={{ background: "rgba(16,185,129,0.12)", color: "#34D399", border: "1px solid rgba(16,185,129,0.2)" }}
                >
                  Live
                </span>
              )}
            </div>
            {lastRun && (
              <span className="text-xs" style={{ color: "#555" }}>
                Last run: {lastRun}
              </span>
            )}
          </div>

          <TerminalWindow title="AI Agent — ClearClaim v3.0">
            <AgentStatusPanel logs={logs} isRunning={isAgentRunning} />
          </TerminalWindow>

          {/* Agent run summary tiles */}
          {summaryTiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-3"
            >
              {summaryTiles.map(({ label, count, color }) => (
                <div
                  key={label}
                  className="card p-4 text-center"
                  style={{ border: `1px solid ${color}20` }}
                >
                  <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                  <p className="text-xs mt-1" style={{ color: "#475569" }}>{label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Pending claims sidebar — 2/5 */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: "#FBBF24" }} />
              <span className="text-sm font-semibold" style={{ color: "#F8FAFC" }}>
                Pending Review
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                style={{ background: "rgba(245,158,11,0.12)", color: "#FBBF24" }}
              >
                {pendingClaims.length}
              </span>
            </div>
            {pendingClaims.length > 0 && !isAgentRunning && (
              <div className="flex items-center gap-1 text-xs" style={{ color: "#334155" }}>
                <Sparkles size={11} />
                Run AI to process
              </div>
            )}
          </div>

          <div className="space-y-2">
            {pendingClaims.length === 0 && !statsLoading && (
              <div className="card p-5 text-center">
                <CheckCircle size={22} style={{ color: "#34D399" }} className="mx-auto mb-2" />
                <p className="text-sm font-medium" style={{ color: "#F8FAFC" }}>All clear!</p>
                <p className="text-xs mt-0.5" style={{ color: "#475569" }}>No pending claims.</p>
              </div>
            )}

            {pendingClaims.slice(0, 7).map((claim, i) => {
              const aiResult = agentResults[claim.claimId];
              const decision = aiResult ? aiResult.decision : (claim.aiDecision ?? "Pending");
              let dotColor = "#555";
              if (decision === "Approve") dotColor = "#10B981";
              if (decision === "Reject") dotColor = "#EF4444";
              if (decision === "Flag") dotColor = "#F59E0B";

              return (
                <motion.div
                  key={claim.claimId}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card p-3 flex items-center justify-between gap-3 relative overflow-hidden"
                >
                  {/* Left edge colored indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: dotColor }} />
                  
                  <div className="flex-1 min-w-0 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold" style={{ color: "#6366F1" }}>
                        #{claim.claimId}
                      </span>
                      <span className="text-xs font-medium truncate" style={{ color: "#E2E8F0" }}>
                        {claim.disease}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs" style={{ color: "#888899" }}>
                        ₹{Number(claim.claimAmount).toLocaleString("en-IN")}
                      </span>
                      {(claim.fraudScore != null) && (
                        <FraudScoreBadge score={claim.fraudScore} />
                      )}
                    </div>
                  </div>
                  
                  
                  {decision !== "Pending" ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.05)", color: dotColor }}>
                      {decision}
                    </span>
                  ) : (
                    <button
                      onClick={() => orchestrateClaim(claim.claimId)}
                      disabled={orchestratingClaim === claim.claimId || isAgentRunning}
                      className="text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider px-2 py-1 rounded transition-colors hover:bg-white/10"
                      style={{ background: "rgba(255,255,255,0.05)", color: "#A78BFA" }}
                      title="Smart Orchestrate (Agent 4)"
                    >
                      {orchestratingClaim === claim.claimId ? (
                        <span className="w-3 h-3 border border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                      ) : (
                        <Zap size={11} />
                      )}
                      Orchestrate
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Predictive Risk Radar (Agent 5) ── */}
      {scanResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-4"
        >
          <div className="flex items-center gap-2">
            <HeartPulse size={18} style={{ color: "#F43F5E" }} />
            <h2 className="text-base font-bold" style={{ color: "#F8FAFC" }}>Predictive Risk Radar</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(244,63,94,0.1)", color: "#FB7185" }}>
              {scanResults.length} Scanned
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scanResults.map((scan) => (
              <div key={scan.customer_id} className="card p-4 relative overflow-hidden">
                {scan.guardian_triggered && (
                  <div className="absolute top-0 right-0 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider rounded-bl-lg">
                    Guardian Triggered
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#F8FAFC" }}>{scan.customer_name}</p>
                    <p className="text-xs" style={{ color: "#94A3B8" }}>ID: #{scan.customer_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: scan.risk_score >= 0.65 ? "#EF4444" : scan.risk_score >= 0.4 ? "#F59E0B" : "#10B981" }}>
                      {scan.risk_score.toFixed(2)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "#64748B" }}>Risk Score</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="text-xs">
                    <span style={{ color: "#475569" }}>Predicted: </span>
                    <span style={{ color: "#E2E8F0" }}>{scan.predicted_conditions.join(", ") || "None"}</span>
                  </div>
                  <div className="text-xs">
                    <span style={{ color: "#475569" }}>Factors: </span>
                    <span style={{ color: "#94A3B8" }}>{scan.risk_factors.join(", ") || "None"}</span>
                  </div>
                </div>
                
                <div className="p-2 rounded bg-white/5 text-xs">
                  <span style={{ color: "#A78BFA" }}>Action: </span>
                  <span style={{ color: "#CBD5E1" }}>{scan.recommended_action}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

    </motion.div>
  );
}

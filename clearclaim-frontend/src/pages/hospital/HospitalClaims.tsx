// HospitalClaims.tsx — Hospital dashboard showing assigned claims and Admit & Verify tab
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import { readApi, writeApi } from "../../services/axiosConfig";
import type { RootState } from "../../store/store";
import ClaimStatusChip from "../../components/ClaimStatusChip";
import TxHashLink from "../../components/TxHashLink";
import {
  AgentHttpService,
  type ClinicalReviewResponse,
} from "../../services/AgentHttpService";
import {
  Building2,
  ClipboardList,
  ShieldCheck,
  CheckCircle,
  Brain,
  Activity,
  FileText,
  AlertTriangle,
  X,
  Search,
  Plus,
  Users,
  HeartPulse,
  UserCheck
} from "lucide-react";

export default function HospitalClaims() {
  const { userId } = useSelector((state: RootState) => state.auth);
  const [claims, setClaims] = useState<any[]>([]);
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Agent 7 State (Clinical AI)
  const [activeReviewId, setActiveReviewId] = useState<number | null>(null);
  const [clinicalReview, setClinicalReview] = useState<ClinicalReviewResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadHospitalData = async () => {
    try {
      // ReadAPI returns HTTP 500 when a hospital has no claims yet, so the
      // two calls must not share one failure path
      const hospRes = await readApi.get(`/api/HospitalRead/${userId}`);
      setHospital(hospRes.data?.record);
      try {
        const claimsRes = await readApi.get(`/api/hospital/${userId}/claims`);
        setClaims(claimsRes.data?.records ?? []);
      } catch {
        setClaims([]); // no claims yet — clean empty state
      }
    } catch (e) {
      console.error(e);
      setLoadError("Could not load claims — is the ReadAPI running on port 5234?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitalData();
  }, [userId]);

  const totalClaims = claims.length;
  const pendingClaims = claims.filter((c) => c.status === "Pending").length;
  const approvedClaims = claims.filter((c) => c.status === "Approved").length;

  const formatDate = (dateStr: any) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN");
  };

  const openClinicalAI = async (claimId: number) => {
    setActiveReviewId(claimId);
    setClinicalReview(null);
    setAiLoading(true);
    try {
      const res = await AgentHttpService.getHospitalAssistant(claimId);
      if (res.data) setClinicalReview(res.data);
    } catch (e) {
      console.error(e);
      alert("Failed to run Clinical AI. Please make sure the backend agents are running.");
      setActiveReviewId(null);
    } finally {
      setAiLoading(false);
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Simple Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <ClipboardList className="text-indigo-400" size={20} /> Assigned Claims
        </h2>
      </div>

      {loadError && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#F87171" }}>
          {loadError}
        </div>
      )}

          {/* ── Claims table ── */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-10 text-center">
                <span className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin inline-block" />
              </div>
            ) : claims.length === 0 ? (
              <div className="p-14 text-center">
                <ClipboardList size={28} className="mx-auto mb-3 text-slate-700" />
                <p className="text-sm font-medium text-slate-100">No claims yet</p>
                <p className="text-xs mt-1 text-slate-500">
                  Claims assigned to this hospital will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-dark w-full">
                  <thead>
                    <tr>
                      <th>Claim ID</th>
                      <th>Date</th>
                      <th>Disease</th>
                      <th className="text-right">Amount (₹)</th>
                      <th>AI Verified</th>
                      <th>Status</th>
                      <th>Tx Hash</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => (
                      <tr key={claim.claimId}>
                        <td>
                          <span className="font-mono font-bold text-xs text-indigo-400">
                            #{claim.claimId}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs text-slate-500">
                            {formatDate(claim.claimDate)}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs font-medium text-slate-100">
                            {claim.disease}
                          </span>
                        </td>
                        <td className="text-right">
                          <span className="text-xs font-semibold text-slate-300">
                            ₹{Number(claim.claimAmount).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td>
                          {claim.aiDecision ? (
                            <div className="flex items-center gap-1.5">
                              <Brain size={11} style={{ color: "#6366F1" }} />
                              <ClaimStatusChip status={claim.aiDecision} />
                            </div>
                          ) : (
                            <span className="text-xs text-slate-700">—</span>
                          )}
                        </td>
                        <td>
                          <ClaimStatusChip status={claim.status} />
                        </td>
                        <td>
                          <TxHashLink hash={claim.txHash} />
                        </td>
                        <td>
                          <button
                            onClick={() => openClinicalAI(claim.claimId)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-white/5"
                            style={{
                              background: "rgba(99,102,241,0.1)",
                              color: "#6366F1",
                              border: "1px solid rgba(99,102,241,0.2)",
                            }}
                            title="AI Clinical Assistant (Agent 7)"
                          >
                            <Activity size={11} /> AI Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

      {/* ── Agent 7: Clinical AI Modal ── */}
      <AnimatePresence>
        {activeReviewId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-xl rounded-2xl overflow-hidden relative"
              style={{ background: "#0F172A", border: "1px solid #1E293B" }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b border-white/5"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(99,102,241,0.1), transparent)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Activity size={18} style={{ color: "#6366F1" }} />
                  <h3 className="font-bold text-white tracking-tight">
                    AI Clinical Assistant
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold tracking-wider">
                    Agent 7
                  </span>
                </div>
                <button
                  onClick={() => setActiveReviewId(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 min-h-[300px]">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 space-y-4">
                    <div className="relative">
                      <span className="absolute inset-0 w-8 h-8 rounded-full border-2 border-indigo-500/20" />
                      <span className="w-8 h-8 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin block" />
                    </div>
                    <p className="text-sm text-slate-400 animate-pulse">
                      Analyzing clinical record…
                    </p>
                  </div>
                ) : clinicalReview ? (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Recommended ICD-10
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-mono font-bold text-indigo-400">
                            {clinicalReview.icd_code}
                          </span>
                          <span className="text-sm text-slate-300">
                            — {clinicalReview.icd_description}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Approval Probability
                        </h4>
                        <span
                          className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                            clinicalReview.approval_probability === "High"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : clinicalReview.approval_probability === "Medium"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {clinicalReview.approval_probability}
                        </span>
                      </div>
                    </div>

                    <div
                      className="p-4 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <ClipboardList size={14} className="text-indigo-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Treatment Protocol
                        </h4>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {clinicalReview.treatment_protocol}
                      </p>
                    </div>

                    <div
                      className="p-4 rounded-xl"
                      style={{
                        background: "rgba(245,158,11,0.05)",
                        border: "1px solid rgba(245,158,11,0.1)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-500">
                          Clinical Notes
                        </h4>
                      </div>
                      <p className="text-sm text-amber-100/70 leading-relaxed">
                        {clinicalReview.clinical_notes}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 py-10">
                    Failed to load analysis.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

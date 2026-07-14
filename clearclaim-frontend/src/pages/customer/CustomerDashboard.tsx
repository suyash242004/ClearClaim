// CustomerDashboard.tsx — Premium customer portal
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { readApi } from "../../services/axiosConfig";
import { AgentHttpService, type CarePlanResponse } from "../../services/AgentHttpService";
import ClaimStatusChip from "../../components/ClaimStatusChip";
import axios from "axios";
import {
  ShieldCheck, HeartPulse, ClipboardList, Users,
  FileText, ArrowRight, AlertCircle, Cpu, Link as LinkIcon, Database, CheckCircle, Wallet
} from "lucide-react";

interface Policy {
  policyId: number;
  planId: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  renewalCount: number;
  coverageAmount?: number;
}

interface Claim {
  claimId: number;
  policyId?: number;
  disease: string;
  claimAmount: number;
  claimDate: string;
  status: string;
}

const quickActions = [
  { to: "/submit-claim",   icon: HeartPulse,    label: "Submit Claim" },
  { to: "/my-claims",      icon: ClipboardList, label: "My Claims" },
  { to: "/browse-plans",   icon: ShieldCheck,   label: "Browse Plans" },
  { to: "/family-members", icon: Users,         label: "Family Members" },
];

export default function CustomerDashboard() {
  const { userId, walletAddress } = useSelector((state: RootState) => state.auth);
  const [customer, setCustomer] = useState<any>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [recentClaims, setRecentClaims] = useState<Claim[]>([]);
  const [carePlan, setCarePlan] = useState<CarePlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [passport, setPassport] = useState<any>(null);
  const [passportLoading, setPassportLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [healthGuardianError, setHealthGuardianError] = useState(false);

  const formatDate = (dateStr: any, options?: Intl.DateTimeFormatOptions) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", options);
  };

  const fetchPassport = async () => {
    if (!walletAddress) return;
    setPassportLoading(true);
    try {
      const res = await axios.get(`http://127.0.0.1:8000/agent/health-passport/${walletAddress}`, { timeout: 20000 });
      setPassport(res.data);
    } catch (e) {
      console.log("No passport found or contract read failed.");
      setPassport(null);
    } finally {
      setPassportLoading(false);
    }
  };

  const handleMintPassport = async () => {
    if (!walletAddress || !userId) return;
    setMinting(true);
    try {
      await axios.post("http://127.0.0.1:8000/agent/health-passport/mint", {
        customer_id: userId,
        wallet_address: walletAddress
      }, { timeout: 60000 });
      alert("Soul-Bound Health Passport successfully minted on X Layer Testnet!");
      fetchPassport();
    } catch (e) {
      console.error(e);
      alert("Failed to mint Health Passport onchain.");
    } finally {
      setMinting(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchPassport();
    } else {
      setPassport(null);
    }
  }, [walletAddress]);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        // NOTE: the ReadAPI returns HTTP 500 for "no policies/claims yet",
        // so each call gets its own catch — a brand-new customer must still
        // see their profile and clean empty states.
        const [custRes, polRes, claimsRes] = await Promise.allSettled([
          readApi.get(`/api/CustomerRead/${userId}`),
          readApi.get(`/api/customer/${userId}/policies`),
          readApi.get(`/api/customer/${userId}/claims`),
        ]);
        if (custRes.status === "fulfilled") setCustomer(custRes.value.data?.record);
        const allPolicies = polRes.status === "fulfilled" ? (polRes.value.data?.records ?? []) : [];
        setPolicies(allPolicies.slice(0, 2));
        const fetchedClaims = claimsRes.status === "fulfilled" ? (claimsRes.value.data?.records ?? []) : [];
        setRecentClaims(fetchedClaims.slice(0, 3));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  // Health Guardian (Agent 6) — loaded independently so a slow/offline AI
  // gateway never blocks the core dashboard render
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    AgentHttpService.getHealthGuardian(userId)
      .then((careRes) => {
        if (!cancelled && careRes.data) setCarePlan(careRes.data);
      })
      .catch((e) => {
        console.error("Health Guardian error:", e);
        if (!cancelled) setHealthGuardianError(true);
      });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      {/* ── Welcome banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card p-6"
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold mb-1 text-indigo-400">
              Welcome back
            </p>
            <h1 className="text-xl font-bold mb-1 text-slate-100">
              {customer?.customerName ?? `Customer #${userId}`}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              {customer?.customerEmail && <span>{customer.customerEmail}</span>}
              {customer?.city && <><span>•</span><span>{customer.city}</span></>}
            </div>
          </div>

          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          >
            ● Active
          </span>
        </div>
      </motion.div>

      {/* ── Quick actions ── */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ to, icon: Icon, label }, i) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={to}
                className="card-hover flex flex-col items-center justify-center p-5 h-full text-center"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
                >
                  <Icon size={18} color="#6366F1" />
                </div>
                <p className="font-medium text-sm text-slate-100">{label}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Health Guardian (Agent 6) - if exists ── */}
      {healthGuardianError ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5 border border-red-500/20"
          style={{ background: "rgba(239, 68, 68, 0.05)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10">
              <AlertCircle size={14} className="text-red-400" />
            </div>
            <h2 className="text-sm font-semibold text-red-400">
              AI Health Guardian Unavailable
            </h2>
          </div>
          <p className="text-xs text-red-400/80">
            The Health Guardian agent could not generate a care plan right now. Is the AI gateway running on port 8000? If it is, verify the Gemini API key in the backend .env.
          </p>
        </motion.div>
      ) : carePlan && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
              <HeartPulse size={14} style={{ color: "#34D399" }} />
            </div>
            <h2 className="text-sm font-semibold text-emerald-400">
              AI Health Guardian
            </h2>
            {carePlan.is_new && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                NEW
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">{carePlan.summary}</p>
        </motion.div>
      )}

      {/* ── Web3 Transparency / Live SBT Health Passport Card ── */}
      {walletAddress && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card p-5 mt-4"
          style={{ background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.2)" }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}>
                <Database size={14} color="#FFF" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                  Verifiable Health Identity <CheckCircle size={12} />
                </h2>
                <p className="text-xs text-slate-400">Soul-Bound Token (SBT) Live on X Layer Testnet</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Connected Wallet</p>
              <p className="text-xs font-mono text-emerald-300">
                {walletAddress}
              </p>
            </div>
          </div>

          {passportLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-3">
              <span className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
              Checking on-chain health records...
            </div>
          ) : passport ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><Cpu size={10} /> Risk Score (SBT)</p>
                  <p className="text-base font-bold text-slate-200">
                    {passport.latest_risk_bps} <span className="text-xs font-normal text-slate-400">bps</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{passport.latest_risk_level} Risk</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><CheckCircle size={10} /> Claim Audits</p>
                  <p className="text-base font-bold text-slate-200">
                    {passport.approved_claims} <span className="text-xs font-normal text-slate-400">/ {passport.total_claims} approved</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">100% onchain proof</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><HeartPulse size={10} /> AI Care Plan</p>
                  <p className="text-base font-bold text-slate-200">
                    {passport.guardian_active ? "Active" : "None"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{passport.guardian_active ? "Health Guardian ON" : "Proactive care"}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><FileText size={10} /> Passport Age</p>
                  <p className="text-base font-bold text-slate-200">
                    {new Date(passport.minted_at * 1000).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">SBT Created</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <LinkIcon size={12} className="text-indigo-400" />
                <a
                  href={`https://www.oklink.com/xlayer-test/address/0x63cC01DDC2aCd8a230679E29A7Be7EBe5769f3E3`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Verify Health Passport SBT Contract on X Layer Explorer ↗
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl text-center" style={{ background: "rgba(0,0,0,0.15)", border: "1px dashed rgba(255,255,255,0.08)" }}>
              <p className="text-sm text-slate-400 mb-3">No verifiable health passport exists for this wallet yet.</p>
              <button
                onClick={handleMintPassport}
                disabled={minting}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-black text-xs font-semibold rounded-full transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                {minting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Minting SBT on X Layer...
                  </>
                ) : (
                  <>
                    <Wallet size={12} />
                    Mint Soulbound Health Passport
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Two-column: policies + recent claims ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Active Policies */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Policies
            </h2>
            <Link to="/my-policies" className="text-xs flex items-center gap-1 transition-colors hover:text-slate-300 text-slate-500">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          <div className="space-y-2">
            {policies.length === 0 ? (
              <div className="card p-5 text-center">
                <AlertCircle size={18} className="mx-auto mb-2 text-slate-600" />
                <p className="text-sm text-slate-500">No policies found.</p>
                <Link to="/browse-plans" className="text-xs mt-2 inline-block transition-colors hover:text-indigo-300 text-indigo-400">
                  Browse Plans
                </Link>
              </div>
            ) : (
              policies.map((policy, i) => (
                <motion.div
                  key={policy.policyId}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="card p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-slate-100">
                        Policy #{policy.policyId}
                      </p>
                      <p className="text-xs mt-1 text-slate-500">
                        Expires {formatDate(policy.endDate, { month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{
                        background: policy.isActive ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)",
                        color: policy.isActive ? "#34D399" : "#64748B",
                      }}
                    >
                      {policy.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Recent Claims */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent Claims
            </h2>
            <Link to="/my-claims" className="text-xs flex items-center gap-1 transition-colors hover:text-slate-300 text-slate-500">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          <div className="card overflow-hidden">
            {recentClaims.length === 0 ? (
              <div className="p-6 text-center">
                <FileText size={18} className="mx-auto mb-2 text-slate-700" />
                <p className="text-sm text-slate-500">No claims yet.</p>
                <Link to="/submit-claim" className="text-xs mt-2 inline-block transition-colors hover:text-indigo-300 text-indigo-400">
                  Submit a Claim
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentClaims.map(claim => (
                  <div key={claim.claimId} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-400">
                          #{claim.claimId}
                        </span>
                        <span className="text-xs font-medium text-slate-100">
                          {claim.disease}
                        </span>
                      </div>
                      <p className="text-xs mt-1 text-slate-500">
                        ₹{Number(claim.claimAmount).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <ClaimStatusChip status={claim.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

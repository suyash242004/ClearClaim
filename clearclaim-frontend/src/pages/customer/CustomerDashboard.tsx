// CustomerDashboard.tsx — Premium customer portal
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { readApi } from "../../services/axiosConfig";
import ClaimStatusChip from "../../components/ClaimStatusChip";
import {
  ShieldCheck, HeartPulse, ClipboardList, Users,
  FileText, ArrowRight, AlertCircle
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
  { to: "/submit-claim",   icon: HeartPulse,    label: "Submit Claim",   color: "#F87171", desc: "File a new claim" },
  { to: "/my-claims",      icon: ClipboardList, label: "My Claims",      color: "#60A5FA", desc: "Track all claims" },
  { to: "/browse-plans",   icon: ShieldCheck,   label: "Browse Plans",   color: "#34D399", desc: "AI-recommended plans" },
  { to: "/family-members", icon: Users,         label: "Family Members", color: "#FBBF24", desc: "Manage dependents" },
];

export default function CustomerDashboard() {
  const { userId } = useSelector((state: RootState) => state.auth);
  const [customer, setCustomer] = useState<any>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [recentClaims, setRecentClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateStr: any, options?: Intl.DateTimeFormatOptions) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", options);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [custRes, polRes] = await Promise.all([
          readApi.get(`/api/CustomerRead/${userId}`),
          readApi.get(`/api/customer/${userId}/policies`),
        ]);
        setCustomer(custRes.data?.record);
        const allPolicies = polRes.data?.records ?? [];
        setPolicies(allPolicies.slice(0, 3));

        // Load claims via Customer endpoint
        const claimsRes = await readApi.get(`/api/customer/${userId}/claims`);
        const fetchedClaims = claimsRes.data?.records ?? [];
        setAllClaims(fetchedClaims);
        setRecentClaims(fetchedClaims.slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* ── Welcome banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0.04) 100%)",
          border: "1px solid rgba(37,99,235,0.18)",
        }}
      >
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-56 h-56 opacity-8 blur-3xl rounded-full pointer-events-none"
          style={{ background: "#2563EB" }} />

        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: "#60A5FA" }}>
              Welcome back
            </p>
            <h1 className="text-2xl font-bold mb-1.5" style={{ color: "#F8FAFC" }}>
              {customer?.customerName ?? `Customer #${userId}`}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "#64748B" }}>
              {customer?.customerEmail && <span>{customer.customerEmail}</span>}
              {customer?.city && <><span>·</span><span>{customer.city}</span></>}
              {customer?.age && <><span>·</span><span>Age {customer.age}</span></>}
              {customer?.historicalDisease && customer.historicalDisease !== "No" && (
                <><span>·</span><span>History: {customer.historicalDisease}</span></>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {customer?.bloodGroup && (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(239,68,68,0.12)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                {customer.bloodGroup}
              </span>
            )}
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(16,185,129,0.1)", color: "#34D399", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              ● Active Member
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Quick actions ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#475569" }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ to, icon: Icon, label, color, desc }, i) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={to}
                className="card-hover flex flex-col p-4 h-full"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${color}14`, border: `1px solid ${color}22` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>
                <p className="font-semibold text-sm mb-0.5" style={{ color: "#F8FAFC" }}>{label}</p>
                <p className="text-xs" style={{ color: "#475569" }}>{desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Two-column: policies + recent claims ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Active Policies */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#475569" }}>
              Active Policies
            </h2>
            <Link to="/my-policies" className="text-xs flex items-center gap-1 transition-colors hover:text-white" style={{ color: "#475569" }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>

          <div className="space-y-3">
            {policies.length === 0 ? (
              <div className="card p-5 text-center">
                <AlertCircle size={18} style={{ color: "#334155" }} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: "#475569" }}>No policies found.</p>
                <Link to="/browse-plans" className="text-xs mt-1.5 inline-block transition-colors hover:text-white" style={{ color: "#2563EB" }}>
                  Browse Plans →
                </Link>
              </div>
            ) : (
              policies.map((policy, i) => {
                const coverageUsed = allClaims
                  .filter(c => c.policyId === policy.policyId && c.status === "Approved")
                  .reduce((sum, c) => sum + Number(c.claimAmount), 0);
                const coverageAmount = policy.coverageAmount ?? 0;
                const percent = coverageAmount > 0 ? Math.min(100, Math.round((coverageUsed / coverageAmount) * 100)) : 0;
                
                return (
                  <motion.div
                    key={policy.policyId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="card p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "#F8FAFC" }}>
                          Policy #{policy.policyId}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
                          Plan {policy.planId} · Expires {formatDate(policy.endDate, { month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: policy.isActive ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.06)",
                          color: policy.isActive ? "#34D399" : "#64748B",
                        }}
                      >
                        {policy.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {/* Coverage bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs" style={{ color: "#475569" }}>
                        <span>Coverage Used</span>
                        <span style={{ color: "#94A3B8" }}>₹{coverageUsed.toLocaleString("en-IN")} / ₹{coverageAmount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-1000" style={{ background: "#2563EB", width: `${percent}%` }} />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Claims */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#475569" }}>
              Recent Claims
            </h2>
            <Link to="/my-claims" className="text-xs flex items-center gap-1 transition-colors hover:text-white" style={{ color: "#475569" }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>

          <div className="card overflow-hidden">
            {recentClaims.length === 0 ? (
              <div className="p-6 text-center">
                <FileText size={18} style={{ color: "#1E293B" }} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: "#475569" }}>No claims yet.</p>
                <Link to="/submit-claim" className="text-xs mt-1.5 inline-block transition-colors hover:text-white" style={{ color: "#2563EB" }}>
                  Submit a Claim →
                </Link>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {recentClaims.map(claim => (
                  <div key={claim.claimId} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold" style={{ color: "#60A5FA" }}>
                          #{claim.claimId}
                        </span>
                        <span className="text-xs font-medium" style={{ color: "#F8FAFC" }}>
                          {claim.disease}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
                        ₹{Number(claim.claimAmount).toLocaleString("en-IN")}
                        {" · "}
                        {formatDate(claim.claimDate)}
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

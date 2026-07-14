import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { readApi } from "../../services/axiosConfig";
import ClaimStatusChip from "../../components/ClaimStatusChip";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  CheckCircle,
  Activity,
  Users,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export default function HospitalDashboard() {
  const { userId } = useSelector((state: RootState) => state.auth);
  const [hospital, setHospital] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch independently — a hospital with zero claims returns an error
        // from the claims endpoint, which must not hide the hospital profile
        const hospRes = await readApi.get(`/api/HospitalRead/${userId}`);
        setHospital(hospRes.data?.record);
        try {
          const claimsRes = await readApi.get(`/api/hospital/${userId}/claims`);
          setClaims(claimsRes.data?.records ?? []);
        } catch {
          setClaims([]); // no claims yet — show empty state
        }
      } catch (e) {
        console.error(e);
        setLoadError("Could not load hospital data — is the ReadAPI running on port 5234?");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId]);

  const totalClaims = claims.length;
  const pendingClaims = claims.filter((c) => c.status === "Pending").length;
  const approvedClaims = claims.filter((c) => c.status === "Approved").length;
  
  // Calculate revenue from approved claims
  const totalRevenue = claims
    .filter((c) => c.status === "Approved")
    .reduce((sum, c) => sum + Number(c.claimAmount), 0);

  const formatDate = (dateStr: any) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN");
  };

  const quickLinks = [
    { to: "/claims", icon: ClipboardList, label: "View All Claims" },
    { to: "/patients", icon: Users, label: "Patient Lookup" },
    { to: "/network", icon: ShieldCheck, label: "Network Plans" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-100">
            Welcome, {hospital?.hospitalName ?? `Hospital #${userId}`}
          </h1>
          <p className="text-sm mt-1 text-slate-500">
            {hospital?.city ?? "Hospital Portal"} · Performance Dashboard
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "rgba(16,185,129,0.1)",
            color: "#34D399",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <ShieldCheck size={13} /> ClearClaim Verified Partner
        </div>
      </div>

      {loadError && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#F87171" }}>
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center">
          <span className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin inline-block" />
        </div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Revenue (Approved)",
                value: `₹${totalRevenue.toLocaleString("en-IN")}`,
                icon: TrendingUp,
                color: "#10B981", // Emerald
              },
              {
                label: "Total Claims",
                value: totalClaims,
                icon: ClipboardList,
                color: "#6366F1", // Indigo
              },
              {
                label: "Pending Review",
                value: pendingClaims,
                icon: Activity,
                color: "#F59E0B", // Amber
              },
              {
                label: "Approved Claims",
                value: approvedClaims,
                icon: CheckCircle,
                color: "#34D399", // Emerald light
              },
            ].map(({ label, value, icon: Icon, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-5 flex flex-col justify-center"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: `${color}14`,
                      border: `1px solid ${color}22`,
                    }}
                  >
                    <Icon size={20} style={{ color }} />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold mb-1" style={{ color }}>
                    {value}
                  </p>
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
            {/* Recent Claims Table */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <ClipboardList size={16} className="text-indigo-400" /> Recent Claims
                </h3>
                <Link to="/claims" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                  View All &rarr;
                </Link>
              </div>

              {claims.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm font-medium text-slate-100">No recent claims</p>
                  <p className="text-xs mt-1 text-slate-500">Claims assigned to you will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="pb-3 font-semibold">ID</th>
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold">Disease</th>
                        <th className="pb-3 font-semibold text-right">Amount</th>
                        <th className="pb-3 font-semibold pl-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims.slice(0, 5).map((claim) => (
                        <tr key={claim.claimId} className="border-b border-white/5 last:border-0">
                          <td className="py-3">
                            <span className="font-mono font-bold text-xs text-indigo-400">
                              #{claim.claimId}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-slate-400">
                            {formatDate(claim.claimDate)}
                          </td>
                          <td className="py-3 text-xs font-medium text-slate-200">
                            {claim.disease}
                          </td>
                          <td className="py-3 text-right text-xs font-semibold text-slate-300">
                            ₹{Number(claim.claimAmount).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 pl-4">
                            <ClaimStatusChip status={claim.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-200 px-1">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                {quickLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="card p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <link.icon size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                        {link.label}
                      </h4>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

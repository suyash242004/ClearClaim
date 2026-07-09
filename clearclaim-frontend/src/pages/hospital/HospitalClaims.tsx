// HospitalClaims.tsx — Hospital dashboard showing assigned claims
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { readApi } from "../../services/axiosConfig";
import type { RootState } from "../../store/store";
import ClaimStatusChip from "../../components/ClaimStatusChip";
import TxHashLink from "../../components/TxHashLink";
import { Building2, ClipboardList, ShieldCheck, CheckCircle, Brain } from "lucide-react";

export default function HospitalClaims() {
  const { userId } = useSelector((state: RootState) => state.auth);
  const [claims, setClaims] = useState<any[]>([]);
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [hospRes, claimsRes] = await Promise.all([
          readApi.get(`/api/HospitalRead/${userId}`),
          readApi.get(`/api/HospitalRead/${userId}/claims`),
        ]);
        setHospital(hospRes.data?.record);
        setClaims(claimsRes.data?.records ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const totalClaims    = claims.length;
  const pendingClaims  = claims.filter(c => c.status === "Pending").length;
  const approvedClaims = claims.filter(c => c.status === "Approved").length;

  const formatDate = (dateStr: any) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold" style={{ color: "#F8FAFC" }}>
            {hospital?.hospitalName ?? `Hospital #${userId}`}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#475569" }}>
            {hospital?.city ?? "Hospital Portal"} · Claims Dashboard
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: "rgba(16,185,129,0.1)", color: "#34D399", border: "1px solid rgba(16,185,129,0.2)" }}
        >
          <ShieldCheck size={13} /> ClearClaim Verified Partner
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Claims",   value: totalClaims,    icon: ClipboardList, color: "#60A5FA" },
          { label: "Pending Review", value: pendingClaims,  icon: Building2,     color: "#FBBF24" },
          { label: "Approved",       value: approvedClaims, icon: CheckCircle,   color: "#34D399" },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card p-5 flex items-center gap-4"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}14`, border: `1px solid ${color}22` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "#475569" }}>{label}</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color }}>{value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Claims table ── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <span className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin inline-block" />
          </div>
        ) : claims.length === 0 ? (
          <div className="p-14 text-center">
            <ClipboardList size={28} style={{ color: "#1E293B" }} className="mx-auto mb-3" />
            <p className="text-sm font-medium" style={{ color: "#F8FAFC" }}>No claims yet</p>
            <p className="text-xs mt-1" style={{ color: "#475569" }}>Claims assigned to this hospital will appear here.</p>
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
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.claimId}>
                    <td>
                      <span className="font-mono font-bold text-xs" style={{ color: "#60A5FA" }}>
                        #{claim.claimId}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs" style={{ color: "#64748B" }}>
                        {formatDate(claim.claimDate)}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-medium" style={{ color: "#F8FAFC" }}>
                        {claim.disease}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="text-xs font-semibold" style={{ color: "#CBD5E1" }}>
                        ₹{Number(claim.claimAmount).toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td>
                      {claim.aiDecision ? (
                        <div className="flex items-center gap-1.5">
                          <Brain size={11} style={{ color: "#60A5FA" }} />
                          <ClaimStatusChip status={claim.aiDecision} />
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "#1E293B" }}>—</span>
                      )}
                    </td>
                    <td><ClaimStatusChip status={claim.status} /></td>
                    <td><TxHashLink hash={claim.txHash} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}

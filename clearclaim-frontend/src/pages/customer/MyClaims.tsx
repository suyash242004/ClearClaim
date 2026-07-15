import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import ClaimHttpService from "../../services/ClaimHttpService";
import type { Claim } from "../../models/Claim";
import { ClipboardList, Activity, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ClaimStatusChip from "../../components/ClaimStatusChip";
import FraudScoreBadge from "../../components/FraudScoreBadge";
import TxHashLink from "../../components/TxHashLink";
import { motion } from "framer-motion";

const MyClaims = () => {
  const { userId } = useSelector((state: RootState) => state.auth);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const res = await ClaimHttpService.getByCustomer(userId!);
        setClaims(res.records ?? []);
      } catch {
        setClaims([]); // new customer has no claims — show empty state, not error
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <p className="text-xs font-medium tracking-[0.2em] uppercase mb-2" style={{ color: "#6366F1" }}>
          Claims History
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Activity size={24} className="text-indigo-400" /> My Claims
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Track the real-time status of your insurance claims verified on the blockchain.
        </p>
      </div>

      {claims.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-12 text-center border border-white/5 bg-white/[0.01]"
        >
          <ClipboardList className="mx-auto text-slate-600 mb-3" size={40} />
          <p className="text-sm text-slate-400">No claims yet.</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            When you file a claim it will appear here with its AI decision, fraud score and blockchain proof.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/submit-claim"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-colors"
              style={{ background: "#6366F1", color: "#fff" }}
            >
              Submit a claim <ArrowRight size={12} />
            </Link>
            <Link
              to="/browse-plans"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              No policy yet? Browse plans →
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden border border-white/10"
        >
          <div className="overflow-x-auto">
            <table className="table-dark w-full text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Claim ID</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Policy ID</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Disease</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount (₹)</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Fraud Score</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Decision</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {claims.map((claim) => (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={claim.claimId}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4">
                      <span className="text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2 py-1 rounded-md text-xs">
                        #{claim.claimId}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-300 font-medium">#{claim.policyId}</td>
                    <td className="px-5 py-4 text-slate-200 font-semibold">{claim.disease}</td>
                    <td className="px-5 py-4">
                      <span className="text-emerald-400 font-bold">
                        ₹{claim.claimAmount.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{new Date(claim.claimDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-5 py-4">
                      <FraudScoreBadge score={claim.fraudScore} />
                    </td>
                    <td className="px-5 py-4">
                      {claim.aiDecision ? (
                        <div className="flex flex-col gap-1">
                          <ClaimStatusChip status={claim.aiDecision as string} />
                          {claim.aiConfidence != null && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {Math.round(Number(claim.aiConfidence) * 100)}% confident
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-xs">AWAITING</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <ClaimStatusChip status={claim.status as string} />
                    </td>
                    <td className="px-5 py-4">
                      {claim.txHash ? (
                        <TxHashLink hash={claim.txHash} />
                      ) : (
                        <span className="text-slate-600 font-mono text-xs">UNMINTED</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MyClaims;

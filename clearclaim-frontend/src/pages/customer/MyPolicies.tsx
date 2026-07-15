import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import PolicyHttpService from "../../services/PolicyHttpService";
import type { Policy } from "../../models/Policy";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FileText, Shield, Calendar, Award, RotateCcw, ArrowRight } from "lucide-react";

export default function MyPolicies() {
  const { userId } = useSelector((state: RootState) => state.auth);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await PolicyHttpService.getByCustomer(userId!);
        setPolicies(res.records ?? []);
      } catch {
        setPolicies([]); // New customer has no policies
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, [userId]);

  const formatDate = (dateStr: any) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  };

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
          My Protection
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          My Active Policies
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your current health insurance policies, coverage details, and renewal milestones.
        </p>
      </div>

      {policies.length === 0 ? (
        <div className="card p-12 text-center border border-white/5 bg-white/[0.01]">
          <FileText className="mx-auto text-slate-600 mb-3" size={40} />
          <p className="text-sm font-medium text-slate-300">You don't have any coverage yet</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Pick a plan that fits your family and it will show up here as an active policy.
          </p>
          <Link
            to="/browse-plans"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            style={{ background: "#6366F1", color: "#fff" }}
          >
            Browse plans to get started <ArrowRight size={12} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {policies.map((policy) => (
            <motion.div
              key={policy.policyId}
              whileHover={{ y: -4 }}
              className="card p-5 border border-white/10 relative overflow-hidden transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
              }}
            >
              {/* Abstract decorative accent */}
              <div 
                className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none"
                style={{ background: "#6366F1" }}
              />

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
                    <Shield size={16} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      {policy.planName || `Policy #${policy.policyId}`}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-500">ID: CC-{policy.policyId}</p>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    policy.isActive 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-white/5 text-slate-500 border border-white/10"
                  }`}
                >
                  {policy.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-3.5">
                {/* Coverage Amount */}
                <div className="bg-black/20 p-3 rounded-xl">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Insurance Coverage</p>
                  <p className="text-lg font-extrabold text-slate-100">
                    {policy.coverageAmount ? `₹${policy.coverageAmount.toLocaleString("en-IN")}` : "₹9,00,000"}
                  </p>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Calendar size={10} /> Active Date
                    </p>
                    <p className="text-slate-300 font-medium">{formatDate(policy.startDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Award size={10} /> Expiry Date
                    </p>
                    <p className="text-slate-300 font-medium">{formatDate(policy.endDate)}</p>
                  </div>
                </div>

                {/* Renewal/Duration Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <RotateCcw size={10} /> Renewals: {policy.renewalCount}
                  </span>
                  <span>Duration: 12 Months</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

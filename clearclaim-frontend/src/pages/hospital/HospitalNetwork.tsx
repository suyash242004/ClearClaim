import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { readApi } from "../../services/axiosConfig";
import { ShieldCheck, HeartPulse, Building2 } from "lucide-react";

export default function HospitalNetwork() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await readApi.get("/api/InsuranceplanRead");
        setPlans(res.data?.records ?? []);
      } catch (err) {
        console.error("Failed to fetch plans", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="text-indigo-400" size={20} /> Network & Affiliations
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Active insurance plans that your hospital is currently in-network for.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center">
          <span className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin inline-block" />
        </div>
      ) : plans.length === 0 ? (
        <div className="card p-14 text-center">
          <p className="text-sm font-medium text-slate-100">No active plans found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.planId}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card overflow-hidden flex flex-col hover:border-indigo-500/30 transition-all duration-300"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/5 bg-gradient-to-br from-indigo-500/10 to-transparent">
                <div className="flex justify-between items-start mb-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mb-3"
                    style={{
                      background: "rgba(99,102,241,0.15)",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
                    <ShieldCheck size={20} className="text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    In-Network
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-100">{plan.planName}</h3>
                <p className="text-xs text-indigo-400 font-mono mt-1">Plan ID: #{plan.planId}</p>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                      Max Coverage
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
                      ₹{Number(plan.coverageAmount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                      Premium / Yr
                    </span>
                    <span className="text-sm font-bold text-slate-300">
                      ₹{Number(plan.premiumAmount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                      Max Members
                    </span>
                    <span className="text-sm font-semibold text-slate-300">
                      {plan.maxMembers}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                      Duration
                    </span>
                    <span className="text-sm font-semibold text-slate-300">
                      {plan.policyDuration} Year(s)
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-white/5 bg-black/20 text-center">
                <span className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                  <HeartPulse size={14} className="text-rose-400" /> Authorized for all cashless treatments
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

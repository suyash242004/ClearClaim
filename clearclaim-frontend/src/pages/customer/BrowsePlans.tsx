// BrowsePlans.tsx — Premium plan grid + AI advisor
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { readApi, writeApi } from "../../services/axiosConfig";
import PolicyAdvisorWidget from "../../components/PolicyAdvisorWidget";
import SpotlightCard from "../../components/SpotlightCard";
import GhastButton from "../../components/GhastButton";
import { Bot, ShieldCheck, Check, Star, Users, Calendar, CheckCircle } from "lucide-react";

interface Plan {
  planId: number;
  planName: string;
  coverageAmount: number;
  premiumAmount: number;
  description: string;
  maxMembers: number;
  policyDuration?: number;
}

const ACCENT_COLORS = ["#60A5FA", "#34D399", "#FBBF24", "#F87171"];

export default function BrowsePlans() {
  const { userId } = useSelector((state: RootState) => state.auth);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [purchased, setPurchased] = useState<number | null>(null);
  const [showAdvisor, setShowAdvisor] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await readApi.get("/api/PlanSearch");
        setPlans(res.data?.records ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePurchase = async (plan: Plan) => {
    setPurchasing(plan.planId);
    try {
      await writeApi.post("/api/PolicyWrite", {
        customerId: userId,
        planId: plan.planId,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        coverageAmount: plan.coverageAmount,
        premiumAmount: plan.premiumAmount,
        status: "Active",
      });
      setPurchased(plan.planId);
      setTimeout(() => setPurchased(null), 3000);
    } catch {
      alert("Purchase failed. Please try again.");
    } finally {
      setPurchasing(null);
    }
  };

  // Mark "Best Value" as the plan with the best coverage/premium ratio
  const bestValueId = plans.length > 0
    ? plans.reduce((best, p) =>
        (p.coverageAmount / p.premiumAmount) > (best.coverageAmount / best.premiumAmount) ? p : best
      ).planId
    : -1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 relative">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold" style={{ color: "#F8FAFC" }}>Insurance Plans</h1>
          <p className="text-sm mt-0.5" style={{ color: "#475569" }}>
            Choose the right coverage for you and your family.
          </p>
        </div>
        <GhastButton
          onClick={() => setShowAdvisor(true)}
          variant="dark"
          className="text-xs px-4 py-2"
        >
          <Bot size={13} style={{ color: "#6366F1" }} className="animate-pulse-glow" />
          AI Advisor
        </GhastButton>
      </div>

      {/* ── Purchase success toast ── */}
      <AnimatePresence>
        {purchased && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}
          >
            <CheckCircle size={16} style={{ color: "#34D399" }} />
            <p className="text-sm font-medium" style={{ color: "#34D399" }}>
              Plan purchased successfully! Check My Policies to view it.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Plan grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <span className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {plans.map((plan, i) => {
            const isBest  = plan.planId === bestValueId;
            const color   = ACCENT_COLORS[i % ACCENT_COLORS.length];

            return (
              <motion.div
                key={plan.planId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="h-full"
              >
                <SpotlightCard
                  className="flex flex-col h-full"
                  style={{
                    borderColor: isBest ? "#6366F1" : plan.planName.toLowerCase().includes('family') ? "#F59E0B" : "#222",
                    background: "#080810",
                  }}
                >
                  {/* Recommended badge */}
                  {isBest && (
                    <div className="absolute top-0 inset-x-0 flex justify-center -translate-y-1/2 z-20">
                      <div
                        className="px-3 py-0.5 text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-1.5"
                        style={{
                          background: "#6366F1",
                          color: "white",
                          borderRadius: "99px",
                          boxShadow: "0 0 20px rgba(99,102,241,0.4)"
                        }}
                      >
                        <Star size={9} fill="white" /> Recommended
                      </div>
                    </div>
                  )}

                  {/* Plan icon */}
                  <div className="p-6 pb-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                      style={{ 
                        background: isBest ? "rgba(99,102,241,0.1)" : plan.planName.toLowerCase().includes('family') ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.05)", 
                        border: `1px solid ${isBest ? "rgba(99,102,241,0.2)" : plan.planName.toLowerCase().includes('family') ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.1)"}` 
                      }}
                    >
                      <ShieldCheck size={22} style={{ color: isBest ? "#6366F1" : plan.planName.toLowerCase().includes('family') ? "#F59E0B" : "#94A3B8" }} />
                    </div>

                    {/* Plan name + description */}
                    <h3 className="font-bold text-lg mb-1" style={{ color: "#fff", letterSpacing: "-0.01em" }}>
                      {plan.planName}
                    </h3>
                    <p className="text-xs leading-relaxed mb-6 min-h-[36px]" style={{ color: "#888899" }}>
                      {plan.description}
                    </p>

                    {/* Premium price */}
                    <div className="mb-6 flex items-baseline gap-1">
                      <span className="text-3xl font-bold" style={{ color: "#fff", letterSpacing: "-0.02em" }}>
                        ₹{plan.premiumAmount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-medium" style={{ color: "#64748B" }}>/yr</span>
                    </div>

                    {/* Feature list */}
                    <div className="space-y-3 mb-8">
                      {[
                        { icon: ShieldCheck, label: `₹${plan.coverageAmount.toLocaleString("en-IN")} total coverage` },
                        { icon: Users,      label: `Covers ${plan.maxMembers} member${plan.maxMembers !== 1 ? "s" : ""}` },
                        { icon: Calendar,   label: `${plan.policyDuration ?? 12}-month policy term` },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-3 text-xs font-medium" style={{ color: "#94A3B8" }}>
                          <Icon size={14} style={{ color: isBest ? "#6366F1" : plan.planName.toLowerCase().includes('family') ? "#F59E0B" : "#64748B" }} />
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Purchase button */}
                  <div className="p-6 pt-0 mt-auto">
                    <button
                      onClick={() => handlePurchase(plan)}
                      disabled={purchasing === plan.planId}
                      className="w-full py-2.5 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center"
                      style={{
                        background: isBest ? "#fff" : "transparent",
                        color: isBest ? "#000" : "#fff",
                        border: isBest ? "none" : "1px solid #333",
                      }}
                      onMouseEnter={e => {
                        if (!isBest) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "#666";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isBest) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "#333";
                        }
                      }}
                    >
                      {purchasing === plan.planId
                        ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        : "Select Plan"
                      }
                    </button>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* AI Advisor widget */}
      <AnimatePresence>
        {showAdvisor && <PolicyAdvisorWidget onClose={() => setShowAdvisor(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

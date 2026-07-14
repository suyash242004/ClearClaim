import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import InsuranceplanHttpService from "../../services/InsuranceplanHttpService";
import PolicyHttpService from "../../services/PolicyHttpService";
import type { Insuranceplan } from "../../models/Insuranceplan";
import { ShoppingCart, ShieldCheck, Users, CalendarClock, CheckCircle2, AlertTriangle } from "lucide-react";
import axios from "axios";

const PurchasePolicy = () => {
  const { userId, walletAddress } = useSelector((state: RootState) => state.auth);

  const [plans, setPlans] = useState<Insuranceplan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await InsuranceplanHttpService.getAll();
        setPlans(res.records ?? []);
      } catch {
        setError("Failed to load plans.");
      }
    };
    fetchPlans();
  }, []);

  const handlePurchase = async () => {
    setError("");
    setSuccess("");

    if (!selectedPlan) { setError("Please select a plan."); return; }
    if (!startDate) { setError("Please select a start date."); return; }

    setLoading(true);
    try {
      const res = await PolicyHttpService.purchase(
        userId!,
        Number(selectedPlan),
        startDate,
      );
      setSuccess(res.message);

      // Auto-mint soulbound health passport onchain if wallet is connected
      if (walletAddress) {
        try {
          await axios.post("http://127.0.0.1:8000/agent/health-passport/mint", {
            customer_id: userId,
            wallet_address: walletAddress
          }, { timeout: 60000 });
          setSuccess(prev => prev + " Your soulbound health passport was also successfully minted on-chain!");
        } catch (e) {
          console.error("Auto-minting SBT failed:", e);
        }
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.errorMessage || (typeof err.response?.data === 'string' ? err.response.data : "Purchase failed.");
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const plan = plans.find((p) => p.planId === Number(selectedPlan));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Page header */}
      <div className="mb-8">
        <p className="text-xs font-medium tracking-[0.2em] uppercase mb-3" style={{ color: "#6366F1" }}>
          Coverage · Onboarding
        </p>
        <h1 className="font-bold leading-tight mb-2" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", color: "#F8FAFC", letterSpacing: "-0.02em" }}>
          Purchase a policy.{" "}
          <span className="font-serif-italic" style={{ fontWeight: 400, color: "#888899" }}>Start covered.</span>
        </h1>
        <p className="text-sm max-w-lg" style={{ color: "#888899" }}>
          Select a plan below and choose your start date. End date is auto-calculated by our policy engine.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 max-w-5xl">
        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-6 space-y-5"
        >
          {/* Plan Selection */}
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "#94A3B8" }}>
              Select Plan
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="input-indigo"
            >
              <option value="">— Choose a Plan —</option>
              {plans.map((p) => (
                <option key={p.planId} value={p.planId}>
                  {p.planName} — ₹{p.premiumAmount.toLocaleString()} / yr
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "#94A3B8" }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="input-indigo"
              style={{ colorScheme: "dark" }}
            />
            <p className="text-xs mt-1.5" style={{ color: "#475569" }}>
              End date will be auto-calculated based on plan duration.
            </p>
          </div>

          {/* Error / Success */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg"
                style={{ background: "rgba(239,68,68,0.08)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg"
                style={{ background: "rgba(16,185,129,0.08)", color: "#34D399", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="btn-ghast w-full justify-center gap-2 py-3"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <ShoppingCart size={15} />
                Purchase Policy
              </>
            )}
          </button>
        </motion.div>

        {/* Plan preview */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AnimatePresence mode="wait">
            {plan ? (
              <motion.div
                key={plan.planId}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="spotlight-card p-6"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
                  e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
                }}
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold" style={{ color: "#6366F1" }}>
                      #{plan.planId}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#475569" }}>
                      Selected Plan
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-4" style={{ color: "#F8FAFC" }}>
                    {plan.planName}
                  </h3>

                  <div className="space-y-3">
                    <PlanRow icon={ShieldCheck} label="Coverage" value={`₹${plan.coverageAmount.toLocaleString()}`} accent="#34D399" />
                    <PlanRow icon={Users} label="Max Members" value={String(plan.maxMembers)} accent="#60A5FA" />
                    <PlanRow icon={CalendarClock} label="Duration" value={`${plan.policyDuration} year(s)`} accent="#FBBF24" />
                  </div>

                  <div className="mt-5 pt-5 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#475569" }}>
                      Annual Premium
                    </p>
                    <p className="text-2xl font-bold gradient-text-indigo">
                      ₹{plan.premiumAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="card p-8 text-center h-full flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <ShieldCheck size={20} style={{ color: "#6366F1" }} />
                </div>
                <p className="text-sm font-medium" style={{ color: "#F8FAFC" }}>Preview your plan</p>
                <p className="text-xs mt-1" style={{ color: "#475569" }}>Select a plan to see coverage details.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
};

const PlanRow = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}14`, border: `1px solid ${accent}22` }}>
        <Icon size={13} style={{ color: accent }} />
      </div>
      <span style={{ color: "#94A3B8" }}>{label}</span>
    </div>
    <span className="font-semibold" style={{ color: "#F8FAFC" }}>{value}</span>
  </div>
);

export default PurchasePolicy;

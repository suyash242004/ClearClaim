// BrowsePlans.tsx — Premium plan grid + AI advisor
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import type { RootState } from "../../store/store";
import { readApi, writeApi } from "../../services/axiosConfig";
import PolicyAdvisorWidget from "../../components/PolicyAdvisorWidget";
import PaymentModal from "../../components/PaymentModal";
import SpotlightCard from "../../components/SpotlightCard";
import GhastButton from "../../components/GhastButton";
import { Bot, ShieldCheck, Check, Star, Users, Calendar, CheckCircle, Wallet } from "lucide-react";
import { setWalletAddress } from "../../store/authSlice";
import axios from "axios";

interface Plan {
  planId: number;
  planName: string;
  coverageAmount: number;
  premiumAmount: number;
  description: string;
  maxMembers: number;
  policyDuration?: number;
}

export default function BrowsePlans() {
  const { userId, walletAddress } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [purchased, setPurchased] = useState<Plan | null>(null);
  const [purchaseError, setPurchaseError] = useState("");
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<Plan | null>(null);

  const connectWallet = async () => {
    setConnecting(true);
    try {
      // Check if OKX Wallet is available
      if (typeof window !== "undefined" && (window as any).okxwallet) {
        const okxWallet = (window as any).okxwallet;
        const accounts = await okxWallet.enable();
        if (accounts && accounts.length > 0) {
          dispatch(setWalletAddress(accounts[0]));
        }
      } else {
        alert("OKX Wallet not detected! Please install it.");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect OKX Wallet!");
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        // Use the InsuranceplanRead endpoint to get all plans
        const res = await readApi.get("/api/InsuranceplanRead");
        const fetchedPlans = (res.data?.records ?? []).map((p: any) => ({
          planId: p.planId,
          planName: p.planName,
          coverageAmount: p.coverageAmount,
          premiumAmount: p.premiumAmount,
          maxMembers: p.maxMembers,
          policyDuration: p.policyDuration || 1,
          description: 
            p.maxMembers === 1 ? "Perfect for individuals seeking comprehensive medical coverage" :
            p.maxMembers === 2 ? "Designed to protect your parents with specialized senior care coverage" :
            p.maxMembers === 4 ? "Complete protection for you, your spouse, and children" :
            p.maxMembers === 8 ? "Maximum coverage for large families with up to 8 members" :
            "Comprehensive medical insurance coverage"
        }));
        setPlans(fetchedPlans);
      } catch (error) {
        console.error("Failed to load plans:", error);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePurchase = async (plan: Plan) => {
    if (!userId) {
      alert("Please login to purchase a policy");
      return;
    }
    setSelectedPlanForPayment(plan);
  };

  const executePurchase = async (plan: Plan) => {
    setPurchasing(plan.planId);
    setPurchaseError("");
    try {
      const startDateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Call the policy purchase business endpoint
      await writeApi.post("/api/policies/purchase", null, {
        params: {
          customerId: userId,
          planId: plan.planId,
          startDate: startDateStr
        }
      });

      // Show success immediately — the SBT mint below is best-effort
      setPurchased(plan);
      setTimeout(() => setPurchased(null), 8000);

      // Auto-mint soulbound health passport onchain if wallet is connected
      if (walletAddress) {
        try {
          await axios.post("http://127.0.0.1:8000/agent/health-passport/mint", {
            customer_id: userId,
            wallet_address: walletAddress
          }, { timeout: 60000 });
        } catch (e) {
          console.error("Auto-minting SBT failed:", e);
        }
      }
    } catch (error: any) {
      const msg = error?.response?.data?.errorMessage ||
                  (typeof error?.response?.data === 'string' ? error.response.data : null) ||
                  "Purchase failed. Please try again.";
      setPurchaseError(msg);
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

  useEffect(() => {
    if (showAdvisor) {
      document.body.classList.add("hide-chat-widget");
    } else {
      document.body.classList.remove("hide-chat-widget");
    }
    return () => document.body.classList.remove("hide-chat-widget");
  }, [showAdvisor]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 relative">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-100">Insurance Plans</h1>
          <p className="text-sm mt-1 text-slate-500">
            Choose the right coverage for you and your family.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!walletAddress ? (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
              style={{ background: "#6366F1", color: "white" }}
            >
              {connecting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Wallet size={14} />
              )}
              Connect OKX Wallet
            </button>
          ) : (
            <button
              onClick={() => { if (confirm("Disconnect OKX Wallet?")) { dispatch(setWalletAddress(null)); } }}
              title="Click to disconnect"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all cursor-pointer"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#6366F1" }}
            >
              <Wallet size={14} />
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </button>
          )}
          <GhastButton
            onClick={() => setShowAdvisor(true)}
            variant="dark"
            className="text-xs px-4 py-2"
          >
            <Bot size={13} style={{ color: "#6366F1" }} className="animate-pulse-glow" />
            AI Advisor
          </GhastButton>
        </div>
      </div>


      {/* ── Purchase feedback ── */}
      <AnimatePresence>
        {purchased && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "#34D399" }}
          >
            <span className="flex items-center gap-2">
              <CheckCircle size={15} />
              Payment received — <strong>{purchased.planName}</strong> is now active!
            </span>
            <Link to="/my-policies" className="text-xs font-semibold underline hover:text-emerald-300 shrink-0">
              View My Policies
            </Link>
          </motion.div>
        )}
        {purchaseError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#F87171" }}
          >
            <span>{purchaseError}</span>
            <button onClick={() => setPurchaseError("")} className="text-xs font-semibold underline hover:text-red-300 shrink-0">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Plan grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <span className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="card p-12 text-center border border-white/5">
          <ShieldCheck size={32} className="mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-medium text-slate-200">No plans available right now</p>
          <p className="text-xs mt-1 text-slate-500">
            Could not load insurance plans — check that the ReadAPI (port 5234) is running, then refresh.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {plans.map((plan, i) => {
            const isBest = plan.planId === bestValueId;

            return (
              <motion.div
                key={plan.planId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="h-full"
              >
                <SpotlightCard
                  className="flex flex-col h-full pt-6"
                  style={{
                    borderColor: isBest ? "#6366F1" : "rgba(255,255,255,0.1)",
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
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                      style={{ 
                        background: isBest ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.05)", 
                        border: `1px solid ${isBest ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.1)"}` 
                      }}
                    >
                      <ShieldCheck size={22} style={{ color: isBest ? "#6366F1" : "#94A3B8" }} />
                    </div>

                    {/* Plan name + description */}
                    <h3 className="font-bold text-lg mb-1 text-white" style={{ letterSpacing: "-0.01em" }}>
                      {plan.planName}
                    </h3>
                    <p className="text-xs leading-relaxed mb-6 min-h-[36px] text-slate-500">
                      {plan.description}
                    </p>

                    {/* Premium price */}
                    <div className="mb-6 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
                        ₹{plan.premiumAmount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-medium text-slate-500">/yr</span>
                    </div>

                    {/* Feature list */}
                    <div className="space-y-3 mb-8">
                      {[
                        { icon: ShieldCheck, label: `₹${plan.coverageAmount.toLocaleString("en-IN")} total coverage` },
                        { icon: Users,      label: `Covers ${plan.maxMembers} member${plan.maxMembers !== 1 ? "s" : ""}` },
                        { icon: Calendar,   label: `${(plan.policyDuration ?? 1) * 12}-month policy term` },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-3 text-xs font-medium text-slate-400">
                          <Icon size={14} style={{ color: isBest ? "#6366F1" : "#64748B" }} />
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
                        background: isBest ? "#6366F1" : "transparent",
                        color: isBest ? "white" : "white",
                        border: isBest ? "none" : "1px solid #333",
                      }}
                      onMouseEnter={(e) => {
                        if (!isBest) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "#666";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isBest) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "#333";
                        }
                      }}
                    >
                      {purchasing === plan.planId
                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

      {/* Payment Modal */}
      {selectedPlanForPayment && (
        <PaymentModal
          plan={selectedPlanForPayment}
          onClose={() => setSelectedPlanForPayment(null)}
          onSuccess={() => {
            executePurchase(selectedPlanForPayment);
            setSelectedPlanForPayment(null);
          }}
        />
      )}
    </motion.div>
  );
}

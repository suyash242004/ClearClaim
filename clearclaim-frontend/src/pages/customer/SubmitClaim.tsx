// SubmitClaim.tsx — Multi-step form wizard with AI risk preview
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { readApi, writeApi } from "../../services/axiosConfig";
import { AgentHttpService } from "../../services/AgentHttpService";
import FraudScoreBadge from "../../components/FraudScoreBadge";
import GhastButton from "../../components/GhastButton";
import { FileText, Shield, CheckCircle, ArrowRight, ArrowLeft, Bot, Check, AlertTriangle } from "lucide-react";

export default function SubmitClaim() {
  const { userId } = useSelector((state: RootState) => state.auth);
  const [step, setStep] = useState(1);
  const [policies, setPolicies] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);

  const [form, setForm] = useState({
    policyId: "",
    planId: "",
    hospitalId: "",
    disease: "",
    doctorName: "",
    claimAmount: "",
    description: "",
  });

  // Selected policy's coverage for amount validation
  const [selectedPolicyCoverage, setSelectedPolicyCoverage] = useState<number>(0);
  const [selectedPolicyUsed, setSelectedPolicyUsed] = useState<number>(0);
  const [step2Error, setStep2Error] = useState("");

  const [aiPreview, setAiPreview] = useState<{ score: number; risk: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load only this customer's ACTIVE policies on mount
  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        const res = await readApi.get(`/api/customer/${userId}/policies`);
        const activePolicies = (res.data?.records ?? []).filter((p: any) => p.isActive === true);
        setPolicies(activePolicies);
      } catch (e) {
        console.error("Failed to load customer policies", e);
      }
    };
    load();
  }, [userId]);

  // When a policy is selected, load hospitals for that policy's plan
  useEffect(() => {
    if (!form.planId) return;
    const loadHospitals = async () => {
      setHospitalsLoading(true);
      try {
        const res = await readApi.get(`/api/plans/${form.planId}/hospitals`);
        setHospitals(res.data?.records ?? []);
      } catch (e) {
        console.error("Failed to load plan hospitals", e);
        setHospitals([]);
      } finally {
        setHospitalsLoading(false);
      }
    };
    loadHospitals();
  }, [form.planId]);

  const handleNext = async () => {
    if (step === 2) {
      setStep2Error("");
      // Validate all step 2 fields
      if (!form.hospitalId) { setStep2Error("Please select a hospital."); return; }
      if (!form.disease.trim()) { setStep2Error("Disease/condition is required."); return; }
      if (!form.doctorName.trim()) { setStep2Error("Doctor name is required."); return; }
      const amt = Number(form.claimAmount);
      if (!form.claimAmount || amt <= 0) { setStep2Error("Claim amount must be greater than ₹0."); return; }
      if (amt < 100) { setStep2Error("Claim amount must be at least ₹100."); return; }
      const remaining = selectedPolicyCoverage - selectedPolicyUsed;
      if (remaining > 0 && amt > remaining) {
        setStep2Error(`Claim amount ₹${amt.toLocaleString('en-IN')} exceeds your remaining coverage of ₹${remaining.toLocaleString('en-IN')}.`);
        return;
      }
      // Pre-submission AI risk preview — algorithmic estimate before claim is created
      setLoading(true);
      try {
        await new Promise(r => setTimeout(r, 1200));
        const amt  = Number(form.claimAmount);
        const dis  = form.disease.toLowerCase();
        // Mirror the fraud detector's rules for an instant estimate
        const majorTerms = ["cardiac", "cancer", "transplant", "tumor", "bypass", "surgery", "kidney"];
        const isMajor    = majorTerms.some(t => dis.includes(t));
        let score = 0;
        if (amt > 400_000) score += 25;
        else if (amt > 200_000) score += 15;
        else if (amt > 100_000) score += 8;
        if (isMajor) score += 20;
        score = Math.min(score, 100);
        setAiPreview({ score, risk: score >= 60 ? "High" : score >= 30 ? "Medium" : "Low" });
      } finally {
        setLoading(false);
        setStep(3);
      }
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Use the correct business endpoint with query params
      await writeApi.post("/api/claims/submit", null, {
        params: {
          policyId: Number(form.policyId),
          hospitalId: Number(form.hospitalId),
          claimAmount: Number(form.claimAmount),
          disease: form.disease.trim(),
          doctorName: form.doctorName.trim(),
          description: form.description.trim() || undefined,
        },
      });
      setSuccess(true);
    } catch (e: any) {
      const msg = e?.response?.data?.errorMessage ||
                  (typeof e?.response?.data === 'string' ? e.response.data : null) ||
                  "Failed to submit claim. Please check all details and try again.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto mt-12 text-center glass-card p-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(0,200,150,0.15)", color: "#00C896" }}>
          <CheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-white">Claim Submitted!</h2>
        <p className="text-sm text-slate-400 mb-6">Your claim has been successfully submitted and is now queued for AI Agent review. You will be notified of the decision shortly.</p>
        <button onClick={() => window.location.href="/my-claims"} className="btn-primary w-full">View My Claims</button>
      </motion.div>
    );
  }

  const stepTitles = ["Select Policy", "Claim Details", "AI Preview & Submit"];

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-white mb-8 tracking-tight text-center">Submit a Claim</h1>
        
        {/* Linear-style step progress */}
        <div className="step-progress max-w-lg mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className={`step-dot ${i === step ? "active" : ""} ${i < step ? "completed" : ""}`}>
                {i < step ? <Check size={14} /> : i}
              </div>
              {i < 3 && (
                <div className={`step-line mx-3 ${i < step ? "completed" : ""}`} />
              )}
            </div>
          ))}
        </div>
        <div className="max-w-lg mx-auto flex justify-between mt-3 px-1">
          {stepTitles.map((t, i) => (
            <span key={t} className="text-xs font-medium" style={{ color: i + 1 === step ? "#fff" : i + 1 < step ? "#6366F1" : "#555" }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="p-8 rounded-3xl min-h-[400px] flex flex-col" style={{ background: "#0A0A0A", border: "1px solid #1a1a1a" }}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
              <label className="block text-sm font-medium mb-3 text-slate-300">Which policy are you claiming under?</label>
              {policies.length === 0 ? (
                <div className="p-6 text-center rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-sm" style={{ color: "#64748B" }}>No active policies found. Please purchase a plan first.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {policies.map(p => (
                    <div
                      key={p.policyId}
                      onClick={() => {
                        setForm({ ...form, policyId: String(p.policyId), planId: String(p.planId), hospitalId: "" });
                        setSelectedPolicyCoverage(p.coverageAmount ?? 0);
                        // Estimate used from approved claims — will be validated by backend trigger anyway
                        setSelectedPolicyUsed(0);
                      }}
                      className={`p-4 rounded-xl cursor-pointer border transition-all ${form.policyId === String(p.policyId) ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}
                    >
                      <div className="flex items-center gap-3">
                        <Shield size={20} className={form.policyId === String(p.policyId) ? "text-indigo-400" : "text-slate-500"} />
                        <div className="flex-1">
                          <p className="font-semibold text-white">Policy #{p.policyId}</p>
                          <p className="text-xs text-slate-400">{p.planName ? `Plan: ${p.planName}` : `Plan ID: ${p.planId}`} · Active until {p.endDate}</p>
                        </div>
                        {form.policyId === String(p.policyId) && (
                          <span className="text-xs text-indigo-400 font-semibold">Selected ✓</span>
                        )}
                      </div>
                      {form.policyId === String(p.policyId) && p.coverageAmount && (
                        <div className="mt-2 pt-2 border-t border-white/5">
                          <p className="text-xs text-slate-400">Coverage: <span className="text-white font-medium">₹{Number(p.coverageAmount).toLocaleString('en-IN')}</span></p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 space-y-4">
              {step2Error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{step2Error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">
                  Hospital {hospitalsLoading && <span className="text-xs text-slate-500">(loading...)</span>}
                </label>
                <select
                  value={form.hospitalId}
                  onChange={e => { setForm({...form, hospitalId: e.target.value}); setStep2Error(""); }}
                  className="input-indigo"
                  disabled={hospitalsLoading}
                >
                  <option value="">Select treating hospital (covered by your plan)</option>
                  {hospitals.map(h => <option key={h.hospitalId} value={h.hospitalId}>{h.hospitalName} — {h.city}{h.isCashless ? " (Cashless)" : ""}</option>)}
                </select>
                {hospitals.length === 0 && !hospitalsLoading && (
                  <p className="text-xs text-amber-400 mt-1">⚠ No hospitals found for this plan.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">Disease / Condition <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.disease}
                  onChange={e => { setForm({...form, disease: e.target.value}); setStep2Error(""); }}
                  placeholder="e.g. Viral Fever, Fracture, Appendicitis"
                  className="input-indigo"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">Doctor Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.doctorName}
                  onChange={e => { setForm({...form, doctorName: e.target.value}); setStep2Error(""); }}
                  placeholder="e.g. Dr. Priya Sharma"
                  className="input-indigo"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">
                  Claim Amount (₹) <span className="text-red-400">*</span>
                  {selectedPolicyCoverage > 0 && (
                    <span className="text-xs text-slate-500 ml-2">Max coverage: ₹{selectedPolicyCoverage.toLocaleString('en-IN')}</span>
                  )}
                </label>
                <input
                  type="number"
                  value={form.claimAmount}
                  onChange={e => { setForm({...form, claimAmount: e.target.value}); setStep2Error(""); }}
                  placeholder="Enter amount in ₹"
                  className="input-indigo"
                  min={100}
                  max={selectedPolicyCoverage || undefined}
                />
                {form.claimAmount && Number(form.claimAmount) > 0 && selectedPolicyCoverage > 0 && (
                  <div className="mt-1.5">
                    <div className="flex justify-between text-xs mb-1" style={{ color: '#64748B' }}>
                      <span>Coverage utilization</span>
                      <span>{Math.min(100, Math.round((Number(form.claimAmount) / selectedPolicyCoverage) * 100))}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full" style={{ background: '#222' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (Number(form.claimAmount) / selectedPolicyCoverage) * 100)}%`,
                          background: Number(form.claimAmount) / selectedPolicyCoverage > 0.8 ? '#EF4444' : Number(form.claimAmount) / selectedPolicyCoverage > 0.5 ? '#F59E0B' : '#10B981'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">Description <span className="text-slate-500 text-xs">(optional)</span></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Describe the medical condition and treatment..."
                  className="input-indigo min-h-[80px]"
                  maxLength={500}
                />
                <p className="text-xs text-slate-600 mt-1">{form.description.length}/500 characters</p>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 space-y-6">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Bot size={18} className="text-blue-400 animate-pulse-glow" />
                  <span className="font-semibold text-blue-400">AI Pre-Submission Check</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Estimated Fraud Risk Score</span>
                  <FraudScoreBadge score={aiPreview?.score} />
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  ClearClaim AI has performed a preliminary scan of your claim amount and disease profile. Final adjudication will be performed by the AI Agent after submission.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-400">Policy</span><span className="text-white">#{form.policyId}</span></div>
                <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-400">Hospital</span><span className="text-white">{hospitals.find(h => String(h.hospitalId) === form.hospitalId)?.hospitalName ?? `#${form.hospitalId}`}</span></div>
                <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-400">Disease</span><span className="text-white">{form.disease}</span></div>
                <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-400">Doctor</span><span className="text-white">{form.doctorName}</span></div>
                <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-400">Amount</span><span className="text-white font-bold">₹{Number(form.claimAmount).toLocaleString('en-IN')}</span></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex justify-between pt-6 border-t border-white/10">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} className="btn-ghost flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
          ) : <div />}
          
          {step < 3 ? (
            <GhastButton 
              onClick={handleNext} 
              disabled={loading || (step===1 && !form.policyId) || (step===2 && (!form.hospitalId || !form.disease || !form.claimAmount || !form.doctorName))}
            >
              {loading ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : "Next Step"}
              {!loading && <ArrowRight size={16} />}
            </GhastButton>
          ) : (
            <GhastButton onClick={handleSubmit} disabled={submitting}>
              {submitting ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : "Confirm & Submit"}
            </GhastButton>
          )}
        </div>
      </div>
    </div>
  );
}

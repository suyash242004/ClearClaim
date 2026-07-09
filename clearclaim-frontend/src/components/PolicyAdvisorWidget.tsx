// PolicyAdvisorWidget.tsx — Chat-style AI recommendation widget
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentHttpService, type PolicyRecommendation } from "../services/AgentHttpService";
import { Bot, X, Send, Sparkles } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function PolicyAdvisorWidget({ onClose }: Props) {
  const [form, setForm] = useState({
    age: "", family_size: "", budget: "", medical_history: "No", city: ""
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PolicyRecommendation | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const age = Number(form.age);
    const familySize = Number(form.family_size);
    const budget = Number(form.budget);

    if (!form.age || age <= 0 || age > 120) {
      setError("Please enter a valid age (1–120)."); return;
    }
    if (!form.family_size || familySize <= 0 || familySize > 20) {
      setError("Family size must be between 1 and 20."); return;
    }
    if (!form.budget || budget <= 0) {
      setError("Please enter a valid annual budget."); return;
    }
    if (!form.city.trim()) {
      setError("Please enter your city."); return;
    }

    setError("");
    setLoading(true);
    try {
      const { data } = await AgentHttpService.recommendPolicy({
        age,
        family_size: familySize,
        budget,
        medical_history: form.medical_history || "No",
        city: form.city.trim(),
      });
      setResult(data);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "AI Agent offline. Start the Python agent on port 8000.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl overflow-hidden"
      style={{
        background: "rgba(13,21,38,0.97)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(0,82,255,0.25)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,82,255,0.1)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(0,82,255,0.1)", background: "rgba(0,82,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0052FF, #00D4FF)" }}>
            <Bot size={12} color="white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: "#F0F4FF" }}>AI Policy Advisor</span>
          <Sparkles size={12} color="#FFB800" />
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/5">
          <X size={14} color="#4A6080" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {!result ? (
          <>
            <p className="text-xs" style={{ color: "#4A6080" }}>
              Tell me about yourself and I'll recommend the best plan for you.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1" style={{ color: "#4A6080" }}>Age</label>
                <input type="number" value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                  placeholder="30" className="input-dark text-xs py-2" />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "#4A6080" }}>Family Size</label>
                <input type="number" value={form.family_size}
                  onChange={e => setForm(f => ({ ...f, family_size: e.target.value }))}
                  placeholder="4" className="input-dark text-xs py-2" />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: "#4A6080" }}>Monthly Budget (₹)</label>
              <input type="number" value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                placeholder="10000" className="input-dark text-xs py-2" />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: "#4A6080" }}>City</label>
              <input type="text" value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="Pune" className="input-dark text-xs py-2" />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: "#4A6080" }}>Medical History</label>
              <select value={form.medical_history}
                onChange={e => setForm(f => ({ ...f, medical_history: e.target.value }))}
                className="input-dark text-xs py-2"
                style={{ background: "rgba(10,15,30,0.8)" }}>
                <option value="No">No pre-existing conditions</option>
                <option value="Diabetes">Diabetes</option>
                <option value="Hypertension">Hypertension</option>
                <option value="Cardiac">Cardiac Issues</option>
                <option value="Asthma">Asthma</option>
              </select>
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg"
                style={{ background: "rgba(255,71,87,0.1)", color: "#FF4757" }}>
                {error}
              </p>
            )}

            <button onClick={handleSubmit} disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Send size={13} /> Get AI Recommendation</>
              )}
            </button>
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="p-3 rounded-xl" style={{ background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} color="#00C896" />
                <span className="text-xs font-semibold" style={{ color: "#00C896" }}>
                  AI Recommends
                </span>
              </div>
              <p className="font-bold text-sm mb-1" style={{ color: "#F0F4FF" }}>
                {result.recommended_plan_name}
              </p>
              <div className="w-full h-1 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{
                  width: `${Math.round(result.confidence_score * 100)}%`,
                  background: "linear-gradient(90deg, #00C896, #00D4FF)"
                }} />
              </div>
              <p className="text-xs" style={{ color: "#4A6080" }}>
                {Math.round(result.confidence_score * 100)}% match confidence
              </p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#B0C4DE" }}>
              {result.reasoning}
            </p>
            <button onClick={() => setResult(null)}
              className="btn-ghost w-full text-xs py-2">
              ← Ask Again
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

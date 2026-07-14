import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { writeApi } from "../services/axiosConfig";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, UserCircle2, ArrowRight, Lock, Mail, Phone, ChevronLeft
} from "lucide-react";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    
    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email address."); return; }
    if (!password.trim() || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    
    // Remove non-digit chars for validator
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) { setError("Please enter a valid phone number."); return; }

    setLoading(true);
    try {
      const payload = {
        customerName: name,
        customerEmail: email,
        customerPhone: cleanPhone,
        password: password,
        age: 30, // Default for now
        gender: "Other", // Must be Male, Female, Other, or null
        city: "Unknown",
        profession: "Unknown",
        bloodGroup: "O+ve", // Must be O+ve, O-ve, A+ve, etc.
        historicalDisease: "None",
        riskScore: 0.0
      };

      await writeApi.post("/api/CustomerWrite", payload);
      
      // Successfully registered! Send them back to login page.
      navigate("/login");
    } catch (err: any) {
      let errorMsg = err.message;
      if (err.response?.data) {
        errorMsg = typeof err.response.data === "string" 
          ? err.response.data 
          : JSON.stringify(err.response.data);
      }
      setError(`Registration failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "#000" }}
    >
      {/* Ambient glow blobs */}
      <div className="glow-blob-blue" style={{ top: "10%", left: "10%", width: "400px", height: "400px" }} />
      <div className="glow-blob-purple" style={{ bottom: "10%", right: "10%", width: "400px", height: "400px" }} />
      {/* ── Top bar: logo + back to landing ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 lg:px-8 h-16 z-50">
        <Link to="/landing" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#fff" }}>
            <Brain size={14} color="#000" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            ClearClaim <span className="gradient-text-indigo">AI</span>
          </span>
        </Link>

        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: "#888899" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#888899")}
        >
          <ChevronLeft size={13} /> Back to Login
        </button>
      </div>

      <div className="w-full max-w-sm px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >


          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#fff", letterSpacing: "-0.02em" }}>
              Welcome to ClearClaim
            </h1>
            <p className="text-sm" style={{ color: "#888899" }}>
              Create your account to get started
            </p>
          </div>

          {/* Form card */}
          <div
            className="p-6 rounded-2xl space-y-5"
            style={{ background: "#111", border: "1px solid #1a1a1a" }}
          >
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#888899" }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="input-indigo"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#888899" }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="input-indigo"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#888899" }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="input-indigo"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#888899" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                placeholder="Create a password"
                className="input-indigo"
              />
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    color: "#F87171",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              onClick={handleRegister}
              disabled={loading}
              className="btn-ghast w-full justify-center gap-2 py-3 mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <div className="text-center mt-4 pt-2">
              <p className="text-xs" style={{ color: "#888899" }}>
                Already have an account?{" "}
                <button onClick={() => navigate('/login')} className="text-white font-medium hover:underline cursor-pointer">
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-xs mt-10 mb-8" style={{ color: "#222" }}>
          Powered by <span style={{ color: "#6366F1" }}>ClearClaim AI</span>
        </p>
      </div>
    </div>
  );
}

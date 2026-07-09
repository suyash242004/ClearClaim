// Login.tsx — Ghast/Anima-style full-black login with spotlight role cards
// ALL existing auth logic (handleLogin, Redux dispatch, readApi calls) is preserved exactly.
// Only the UI has been redesigned.

import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../store/authSlice";
import { readApi } from "../services/axiosConfig";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, ShieldCheck, Building2, UserCircle2,
  ArrowRight, Lock, Hash, Eye, EyeOff,
  ChevronLeft, Wallet
} from "lucide-react";

type Role = "customer" | "admin" | "hospital";

const roleConfig = {
  customer: {
    icon: UserCircle2,
    label: "Customer Portal",
    shortLabel: "Customer",
    desc: "Access your policies, claims, and AI insurance advisor",
    color: "#34D399",
  },
  admin: {
    icon: ShieldCheck,
    label: "Admin Control Center",
    shortLabel: "Admin",
    desc: "Run AI agents, manage claims, and monitor fraud scores",
    color: "#6366F1",
  },
  hospital: {
    icon: Building2,
    label: "Hospital Dashboard",
    shortLabel: "Hospital",
    desc: "View and verify claims assigned to your hospital",
    color: "#F59E0B",
  },
};

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Auth logic — UNCHANGED from original ──────────────────────
  const handleLogin = async () => {
    setError("");
    if (!selectedRole) { setError("Please select a role."); return; }

    // Admin
    if (selectedRole === "admin") {
      if (adminPassword !== "admin123") { setError("Invalid admin password."); return; }
      dispatch(login({ role: "admin", userId: null }));
      navigate("/");
      return;
    }

    // Hospital
    if (selectedRole === "hospital") {
      if (!userId || isNaN(Number(userId)) || Number(userId) <= 0) {
        setError("Please enter a valid Hospital ID.");
        return;
      }
      if (password !== "hospital@2026") {
        setError("Invalid hospital password.");
        return;
      }
      setLoading(true);
      try {
        const res = await readApi.get(`/api/HospitalRead/${userId}`);
        if (!res.data?.record) { setError(`No hospital found with ID ${userId}.`); return; }
        dispatch(login({ role: "hospital", userId: Number(userId) }));
        navigate("/");
      } catch { setError(`Hospital ID ${userId} not found.`); }
      finally { setLoading(false); }
      return;
    }

    // Customer
    if (!userId || isNaN(Number(userId)) || Number(userId) <= 0) {
      setError("Please enter a valid Customer ID.");
      return;
    }
    if (!password.trim()) { setError("Please enter your password."); return; }

    setLoading(true);
    try {
      const res = await readApi.get(`/api/CustomerRead/${userId}`);
      const record = res.data?.record;
      if (!record) { setError(`No customer found with ID ${userId}.`); return; }
      if (record.password !== password) { setError("Incorrect password. Please try again."); return; }
      dispatch(login({ role: "customer", userId: Number(userId) }));
      navigate("/");
    } catch (err: any) { 
      setError(`Login failed: ${err.message || 'Unknown error'}`); 
    }
    finally { setLoading(false); }
  };

  const cfg = selectedRole ? roleConfig[selectedRole] : null;

  const resetRole = () => {
    setSelectedRole(null);
    setError("");
    setUserId("");
    setPassword("");
    setAdminPassword("");
  };

  // ── Spotlight handler for role cards ───────────────────────────
  const handleSpotlight = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative"
      style={{ background: "#000" }}
    >
      {/* ── Top bar: logo + back to landing ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 lg:px-8 h-16">
        <Link to="/landing" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#fff" }}>
            <Brain size={14} color="#000" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            ClearClaim <span className="gradient-text-indigo">AI</span>
          </span>
        </Link>
        <Link
          to="/docs"
          className="text-xs font-medium transition-colors"
          style={{ color: "#555" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
        >
          Documentation →
        </Link>
      </div>

      {/* ── Main content ── */}
      <div className="w-full max-w-2xl px-6">
        <AnimatePresence mode="wait">
          {/* ════════════════════════════════════════
              STATE 1: Role selection (no role picked)
              ════════════════════════════════════════ */}
          {!selectedRole && (
            <motion.div
              key="role-picker"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="text-center mb-12">
                <h1
                  className="font-bold mb-3"
                  style={{ fontSize: "clamp(28px, 4vw, 40px)", color: "#fff", letterSpacing: "-0.02em" }}
                >
                  Welcome back
                </h1>
                <p className="text-sm" style={{ color: "#888899" }}>
                  Select your role to access the platform
                </p>
              </div>

              {/* Role cards — 3 in a row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(Object.entries(roleConfig) as [Role, typeof roleConfig.admin][]).map(([role, c], i) => {
                  const Icon = c.icon;
                  return (
                    <motion.button
                      key={role}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => { setSelectedRole(role); setError(""); }}
                      onMouseMove={handleSpotlight}
                      className="spotlight-card p-6 text-center cursor-pointer group"
                      style={{ minHeight: "200px" }}
                    >
                      <div className="relative z-10 flex flex-col items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                          style={{ background: `${c.color}18`, border: `1px solid ${c.color}30` }}
                        >
                          <Icon size={22} style={{ color: c.color }} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm mb-1" style={{ color: "#fff" }}>
                            {c.shortLabel}
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: "#888899" }}>
                            {c.desc}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Wallet placeholder */}
              <div className="flex items-center justify-center gap-2 mt-8">
                <Wallet size={12} style={{ color: "#333" }} />
                <span className="text-xs" style={{ color: "#333" }}>
                  or connect wallet to sign in
                </span>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════
              STATE 2: Login form (role selected)
              ════════════════════════════════════════ */}
          {selectedRole && (
            <motion.div
              key="login-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-sm mx-auto"
            >
              {/* Back button */}
              <button
                onClick={resetRole}
                className="flex items-center gap-1.5 text-xs mb-8 transition-colors"
                style={{ color: "#555" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
              >
                <ChevronLeft size={13} /> Back to role selection
              </button>

              {/* Role header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  {(() => {
                    if (!selectedRole) return null;
                    const Icon = roleConfig[selectedRole].icon;
                    return (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${cfg?.color}18`, border: `1px solid ${cfg?.color}30` }}
                      >
                        <Icon size={16} style={{ color: cfg?.color }} />
                      </div>
                    );
                  })()}
                  <h2 className="text-xl font-bold" style={{ color: "#fff" }}>
                    {cfg?.label ?? ""}
                  </h2>
                </div>
                <p className="text-sm" style={{ color: "#888899" }}>
                  {cfg?.desc ?? ""}
                </p>
              </div>

              {/* Form card */}
              <div
                className="p-6 rounded-2xl space-y-5"
                style={{ background: "#111", border: "1px solid #1a1a1a" }}
              >
                {/* Customer: ID + password */}
                {selectedRole === "customer" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: "#888899" }}>
                        Customer ID
                      </label>
                      <div className="relative">
                        <Hash size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#444" }} />
                        <input
                          type="number"
                          value={userId}
                          onChange={(e) => setUserId(e.target.value)}
                          placeholder="e.g. 101"
                          className="input-indigo pl-9"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: "#888899" }}>
                        Password
                      </label>
                      <div className="relative">
                        <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#444" }} />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                          placeholder="Enter your password"
                          className="input-indigo pl-9 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2"
                        >
                          {showPassword
                            ? <EyeOff size={13} style={{ color: "#555" }} />
                            : <Eye size={13} style={{ color: "#555" }} />
                          }
                        </button>
                      </div>
                      <p className="text-xs mt-2" style={{ color: "#333" }}>Default: password123</p>
                    </div>
                  </>
                )}

                {/* Admin: password only */}
                {selectedRole === "admin" && (
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "#888899" }}>
                      Admin Password
                    </label>
                    <div className="relative">
                      <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#444" }} />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        placeholder="Enter admin password"
                        className="input-indigo pl-9 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      >
                        {showPassword
                          ? <EyeOff size={13} style={{ color: "#555" }} />
                          : <Eye size={13} style={{ color: "#555" }} />
                        }
                      </button>
                    </div>
                    <p className="text-xs mt-2" style={{ color: "#333" }}>Default: admin123</p>
                  </div>
                )}

                {/* Hospital: ID + password */}
                {selectedRole === "hospital" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: "#888899" }}>
                        Hospital ID
                      </label>
                      <div className="relative">
                        <Hash size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#444" }} />
                        <input
                          type="number"
                          value={userId}
                          onChange={(e) => setUserId(e.target.value)}
                          placeholder="e.g. 1"
                          className="input-indigo pl-9"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: "#888899" }}>
                        Password
                      </label>
                      <div className="relative">
                        <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#444" }} />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                          placeholder="Enter hospital password"
                          className="input-indigo pl-9 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2"
                        >
                          {showPassword
                            ? <EyeOff size={13} style={{ color: "#555" }} />
                            : <Eye size={13} style={{ color: "#555" }} />
                          }
                        </button>
                      </div>
                      <p className="text-xs mt-2" style={{ color: "#333" }}>Default: hospital@2026</p>
                    </div>
                  </>
                )}

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

                {/* Submit — Ghast-style white pill */}
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="btn-ghast w-full justify-center gap-2 py-3"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign in to {cfg?.shortLabel}
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom */}
        <p className="text-center text-xs mt-10" style={{ color: "#222" }}>
          Powered by <span style={{ color: "#6366F1" }}>ClearClaim AI</span>
          {" · "}OKX.AI Genesis Hackathon 2026
        </p>
      </div>
    </div>
  );
}

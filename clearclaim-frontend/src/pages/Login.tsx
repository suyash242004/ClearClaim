import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../store/authSlice";
import { readApi } from "../services/axiosConfig";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ShieldCheck,
  Building2,
  UserCircle2,
  ArrowRight,
  Lock,
  Hash,
  Eye,
  EyeOff,
  Mail,
  ChevronLeft,
} from "lucide-react";

type Role = "customer" | "admin" | "hospital";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Unified login defaults to customer
  const [selectedRole, setSelectedRole] = useState<Role>("customer");

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    // Admin
    if (selectedRole === "admin") {
      if (adminPassword !== "ClearClaim@Admin2026") {
        setError("Invalid admin password.");
        return;
      }
      dispatch(login({ role: "admin", userId: null }));
      navigate("/", { replace: true });
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
        if (!res.data?.record) {
          setError(`No hospital found with ID ${userId}.`);
          return;
        }
        dispatch(login({ role: "hospital", userId: Number(userId) }));
        navigate("/", { replace: true });
      } catch {
        setError(`Hospital ID ${userId} not found.`);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Customer
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const res = await readApi.get(
        `/api/CustomerRead/email/${encodeURIComponent(email)}`,
      );
      const record = res.data?.record;
      if (!record) {
        setError(`No customer found with email ${email}.`);
        return;
      }
      if (record.password !== password) {
        setError("Incorrect password. Please try again.");
        return;
      }
      dispatch(login({ role: "customer", userId: record.customerId }));
      navigate("/", { replace: true });
    } catch (err: any) {
      let errorMsg = err.message;
      if (err.response?.status === 404) errorMsg = "Email address not found.";
      setError(`Login failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const switchRole = (role: Role) => {
    setSelectedRole(role);
    setError("");
    setShowPassword(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "#000" }}
    >
      {/* Ambient glow blobs */}
      <div
        className="glow-blob-blue"
        style={{ top: "10%", left: "10%", width: "400px", height: "400px" }}
      />
      <div
        className="glow-blob-purple"
        style={{ bottom: "10%", right: "10%", width: "400px", height: "400px" }}
      />
      {/* ── Top bar: logo + back to landing ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 lg:px-8 h-16 z-50">
        <Link to="/landing" className="flex items-center gap-2.5 group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#fff" }}
          >
            <Brain size={14} color="#000" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            ClearClaim <span className="gradient-text-indigo">AI</span>
          </span>
        </Link>
        <button
          onClick={() => navigate("/landing")}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: "#888899" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#888899")}
        >
          <ChevronLeft size={13} /> Back to Home
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="w-full max-w-sm px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedRole}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header / Titles */}
            <div className="mb-6 text-center">
              <h1
                className="text-2xl font-bold mb-1"
                style={{ color: "#fff", letterSpacing: "-0.02em" }}
              >
                Welcome to ClearClaim
              </h1>
              <p className="text-sm" style={{ color: "#888899" }}>
                Select your portal to continue
              </p>
            </div>

            {/* Segmented Tabs */}
            <div
              className="flex items-center p-1 rounded-xl mb-8"
              style={{ background: "#111", border: "1px solid #1a1a1a" }}
            >
              <button
                onClick={() => switchRole("customer")}
                className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all duration-300`}
                style={{
                  background:
                    selectedRole === "customer" ? "#222" : "transparent",
                  color: selectedRole === "customer" ? "#fff" : "#666",
                }}
              >
                Customer
              </button>
              <button
                onClick={() => switchRole("admin")}
                className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all duration-300`}
                style={{
                  background:
                    selectedRole === "admin" ? "#6366F115" : "transparent",
                  color: selectedRole === "admin" ? "#6366F1" : "#666",
                }}
              >
                Admin
              </button>
              <button
                onClick={() => switchRole("hospital")}
                className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all duration-300`}
                style={{
                  background:
                    selectedRole === "hospital" ? "#F59E0B15" : "transparent",
                  color: selectedRole === "hospital" ? "#F59E0B" : "#666",
                }}
              >
                Provider
              </button>
            </div>

            {/* Demo Auto-fill Buttons */}
            <div className="flex justify-center mb-6">
              {selectedRole === "customer" && (
                <button
                  onClick={() => { setEmail("suy@gmail.com"); setPassword("password123"); }}
                  className="px-3 py-1.5 text-[11px] rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  🚀 Demo: Auto-fill Suyash Matade
                </button>
              )}
              {selectedRole === "admin" && (
                <button
                  onClick={() => { setAdminPassword("ClearClaim@Admin2026"); }}
                  className="px-3 py-1.5 text-[11px] rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                >
                  🛡️ Demo: Auto-fill Admin
                </button>
              )}
              {selectedRole === "hospital" && (
                <button
                  onClick={() => { setUserId("1"); setPassword("hospital@2026"); }}
                  className="px-3 py-1.5 text-[11px] rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition-colors"
                >
                  🏥 Demo: Auto-fill City Hospital
                </button>
              )}
            </div>

            {/* Form card */}
            <div
              className="p-6 rounded-2xl space-y-5"
              style={{ background: "#111", border: "1px solid #1a1a1a" }}
            >
              {/* Customer Fields */}
              {selectedRole === "customer" && (
                <>
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "#888899" }}
                    >
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
                    <div className="flex justify-between mb-2">
                      <label
                        className="block text-xs font-medium"
                        style={{ color: "#888899" }}
                      >
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        placeholder="Enter your password"
                        className="input-indigo pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff size={13} style={{ color: "#555" }} />
                        ) : (
                          <Eye size={13} style={{ color: "#555" }} />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Hospital Fields */}
              {selectedRole === "hospital" && (
                <>
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "#888899" }}
                    >
                      Hospital ID
                    </label>
                    <input
                      type="number"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Enter provider ID"
                      className="input-amber"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "#888899" }}
                    >
                      Access PIN / Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        placeholder="Enter provider password"
                        className="input-amber pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff size={13} style={{ color: "#555" }} />
                        ) : (
                          <Eye size={13} style={{ color: "#555" }} />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Admin Fields */}
              {selectedRole === "admin" && (
                <div>
                  <label
                    className="block text-xs font-medium mb-2"
                    style={{ color: "#888899" }}
                  >
                    Master Admin Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      placeholder="Enter administrative password"
                      className="input-indigo pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff size={13} style={{ color: "#555" }} />
                      ) : (
                        <Eye size={13} style={{ color: "#555" }} />
                      )}
                    </button>
                  </div>
                </div>
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

              {/* Submit */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="btn-ghast w-full justify-center gap-2 py-3"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              {/* Customer Registration Link */}
              {selectedRole === "customer" && (
                <div className="text-center mt-4">
                  <p className="text-xs" style={{ color: "#888899" }}>
                    Don't have an account?{" "}
                    <Link
                      to="/register"
                      className="text-white font-medium hover:underline"
                    >
                      Sign Up
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center justify-center pb-8">
          <p className="text-center text-xs mb-2" style={{ color: "#222" }}>
            Powered by <span style={{ color: "#6366F1" }}>ClearClaim AI</span>
            {" · "}OKX.AI Genesis Hackathon 2026
          </p>
          <Link
            to="/demo"
            className="text-xs transition-colors hover:text-white"
            style={{ color: "#333" }}
          >
            View demo credentials
          </Link>
        </div>
      </div>
    </div>
  );
}

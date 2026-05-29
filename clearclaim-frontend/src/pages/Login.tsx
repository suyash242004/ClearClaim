// Login.tsx
// Landing page of ClearClaim application
// User selects their role (Customer / Admin / Hospital)
// and enters their ID or credentials
// On success — dispatches login action to Redux store

import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { login } from "../store/authSlice";
import { readApi } from "../services/axiosConfig";
import { Shield, Database } from "lucide-react";

// Role type for selection
type Role = "customer" | "admin" | "hospital";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State for selected role and input fields
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [verifying, setVerifying] = useState(false);

  // Handle login — async to verify ID exists in DB before logging in
  const handleLogin = async () => {
    setError("");

    if (!selectedRole) {
      setError("Please select a role.");
      return;
    }

    // Admin login — hardcoded credentials
    if (selectedRole === "admin") {
      if (adminPassword !== "admin123") {
        setError("Invalid admin password.");
        return;
      }
      dispatch(login({ role: "admin", userId: null }));
      return;
    }

    // Customer / Hospital — validate ID format
    if (!userId || isNaN(Number(userId)) || Number(userId) <= 0) {
      setError(
        `Please enter a valid ${selectedRole === "customer" ? "Customer" : "Hospital"} ID.`,
      );
      return;
    }

    // Verify ID exists in DB before logging in
    setVerifying(true);
    try {
      const endpoint =
        selectedRole === "customer"
          ? `/api/CustomerRead/${userId}`
          : `/api/HospitalRead/${userId}`;
      const res = await readApi.get(endpoint);
      const record = res.data?.record;

      if (!record) {
        setError(
          selectedRole === "customer"
            ? `No customer found with ID ${userId}. Please check your ID.`
            : `No hospital found with ID ${userId}. Please check your ID.`,
        );
        return;
      }

      // ID verified — dispatch login
      dispatch(login({ role: selectedRole, userId: Number(userId) }));
    } catch {
      setError(`ID ${userId} not found. Please enter a valid ID.`);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Shield className="text-blue-700" size={40} />
            <h1 className="text-4xl font-bold text-blue-700">ClearClaim</h1>
          </div>
          <p className="text-slate-600 text-base font-medium">Medical Insurance Portal</p>
          <p className="text-slate-400 text-sm mt-1">
            Powered by Simplify Healthcare
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Sign In</h2>

          {/* Role Selection */}
          <p className="text-sm text-slate-500 mb-3">Select your role</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {(["customer", "admin", "hospital"] as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => {
                  setSelectedRole(role);
                  setUserId("");
                  setAdminPassword("");
                  setError("");
                }}
                className={`py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-all
                  ${
                    selectedRole === role
                      ? "bg-blue-700 text-white border-blue-700"
                      : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                  }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Input fields based on role */}
          {selectedRole === "customer" && (
            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-1">
                Customer ID
              </label>
              <input
                type="number"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your Customer ID"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {selectedRole === "hospital" && (
            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-1">
                Hospital ID
              </label>
              <input
                type="number"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your Hospital ID"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {selectedRole === "admin" && (
            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-1">
                Admin Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Error message */}
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={verifying}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 rounded-lg transition-colors text-sm disabled:opacity-60"
          >
            {verifying ? "Verifying..." : "Sign In"}
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 Simplify Healthcare. All rights reserved.
        </p>

        {/* Database Explorer link */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate("/db-explorer")}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-300 hover:border-blue-300 px-4 py-2 rounded-lg transition-colors"
          >
            <Database size={15} />
            Database Explorer
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

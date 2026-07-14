import { useState } from "react";
import { motion } from "framer-motion";
import { readApi } from "../../services/axiosConfig";
import { Search, UserCheck, CheckCircle } from "lucide-react";

export default function HospitalPatientLookup() {
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patient, setPatient] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setError("");
    setPatient(null);
    setPolicies([]);
    setClaims([]);

    try {
      // Patient must exist; policies/claims return HTTP 500 when empty,
      // so they get their own catches (a patient with no claims is valid)
      const custRes = await readApi.get(`/api/CustomerRead/${searchId}`);

      if (!custRes.data?.record) {
        setError(`No customer found with ID #${searchId}`);
      } else {
        setPatient(custRes.data.record);
        const [polRes, claimsRes] = await Promise.allSettled([
          readApi.get(`/api/customer/${searchId}/policies`),
          readApi.get(`/api/customer/${searchId}/claims`),
        ]);
        setPolicies(polRes.status === "fulfilled" ? (polRes.value.data?.records ?? []) : []);
        setClaims(claimsRes.status === "fulfilled" ? (claimsRes.value.data?.records ?? []) : []);
      }
    } catch (err: any) {
      console.error(err);
      setError(`No customer found with ID #${searchId}. Please verify the ID.`);
    } finally {
      setLoading(false);
    }
  };

  const getRemainingCoverage = (policy: any) => {
    const approvedClaimsSum = claims
      .filter((c) => c.policyId === policy.policyId && c.status === "Approved")
      .reduce((sum, c) => sum + Number(c.claimAmount), 0);
    return Math.max(0, Number(policy.coverageAmount) - approvedClaimsSum);
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <UserCheck className="text-indigo-400" size={20} /> Admissions Desk - Patient Lookup
        </h2>
      </div>

      <div className="card p-6 space-y-6">
        <p className="text-sm text-slate-400">
          Search for a patient using their Customer ID to instantly verify their active insurance policies and remaining coverage limits.
        </p>

        <form onSubmit={handleSearch} className="flex gap-3 max-w-lg">
          <input
            type="number"
            placeholder="Customer ID (e.g. 101)"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="input-indigo flex-1 text-sm py-2 px-3"
            style={{ background: "rgba(0,0,0,0.3)" }}
          />
          <button
            type="submit"
            disabled={loading || !searchId}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-all"
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Verify Patient
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {patient && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-6 border-t border-white/5 space-y-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg">
                {patient.customerName.charAt(0)}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-200">{patient.customerName}</h3>
                <p className="text-xs text-slate-400">
                  ID: #{patient.customerId} &nbsp;|&nbsp; {patient.customerEmail} &nbsp;|&nbsp; {patient.customerPhone}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300">
                    Age: {patient.age}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300">
                    Gender: {patient.gender}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300">
                    Blood Group: {patient.bloodGroup || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Active Coverages ({policies.length})</h4>
              
              {policies.length === 0 ? (
                <p className="text-sm text-slate-500">No active insurance policies found for this patient.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {policies.map((p) => {
                    const remaining = getRemainingCoverage(p);
                    const isExhausted = remaining <= 0;
                    
                    return (
                      <div key={p.policyId} className="card bg-black/40 p-4 border border-white/5 relative overflow-hidden">
                        {isExhausted && (
                          <div className="absolute inset-0 bg-red-500/5 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-red-500/20 shadow-lg transform rotate-[-15deg]">
                              Limit Exhausted
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h5 className="font-bold text-slate-200">{p.planName || `Plan #${p.planId}`}</h5>
                            <p className="text-xs text-indigo-400 font-mono mt-0.5">Policy #CC-{p.policyId}</p>
                          </div>
                          {!isExhausted && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider border border-emerald-500/20">
                              <CheckCircle size={10} /> Active
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Max Coverage:</span>
                            <span className="font-semibold text-slate-300">₹{Number(p.coverageAmount).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-emerald-500/80 font-medium">Remaining Limit:</span>
                            <span className="font-bold text-emerald-400 text-lg">₹{remaining.toLocaleString("en-IN")}</span>
                          </div>
                          
                          <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                            <div
                              className={`h-1.5 rounded-full ${isExhausted ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (remaining / Number(p.coverageAmount)) * 100)}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-500 flex justify-between">
                          <span>Valid from: {formatDate(p.startDate)}</span>
                          <span>Expires: {formatDate(p.endDate)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

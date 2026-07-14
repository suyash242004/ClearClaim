import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminHttpService from "../../services/AdminHttpService";
import type { Customer } from "../../models/Customer";
import { Search, Users, X, AlertTriangle } from "lucide-react";

const CustomerSearch = () => {
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [disease, setDisease] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSearch = async () => {
    setError("");
    setMessage("");

    if (!city && !profession && !bloodGroup && !disease) {
      setError("Please provide at least one search filter.");
      return;
    }

    setLoading(true);
    try {
      const res = await AdminHttpService.searchCustomers(
        city || undefined,
        profession || undefined,
        bloodGroup || undefined,
        disease || undefined,
      );
      const records = res.records ?? [];
      setCustomers(records);
      if (records.length === 0)
        setMessage("No customers found for given filters.");
    } catch (err: any) {
      const errMsg = err.response?.data?.errorMessage || (typeof err.response?.data === 'string' ? err.response.data : "Search failed.");
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCity(""); setProfession(""); setBloodGroup(""); setDisease("");
    setCustomers([]); setError(""); setMessage("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Page header */}
      <div className="mb-8">
        <p className="text-xs font-medium tracking-[0.2em] uppercase mb-3" style={{ color: "#6366F1" }}>
          Admin · Directory
        </p>
        <h1 className="font-bold leading-tight mb-2" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", color: "#F8FAFC", letterSpacing: "-0.02em" }}>
          Customer search.{" "}
          <span className="font-serif-italic" style={{ fontWeight: 400, color: "#888899" }}>Filtered instantly.</span>
        </h1>
        <p className="text-sm max-w-lg" style={{ color: "#888899" }}>
          Search customers by city, profession, blood group, or medical history.
        </p>
      </div>

      {/* Search Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card p-5 mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <FilterInput label="City" value={city} onChange={setCity} placeholder="e.g. Pune" />
          <FilterInput label="Profession" value={profession} onChange={setProfession} placeholder="e.g. Doctor" />
          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: "#94A3B8" }}>
              Blood Group
            </label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="input-indigo"
            >
              <option value="">— Any —</option>
              {["A+ve", "A-ve", "B+ve", "B-ve", "O+ve", "O-ve", "AB+ve", "AB-ve"].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
          <FilterInput label="Disease" value={disease} onChange={setDisease} placeholder="e.g. Diabetes" />
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={handleSearch} disabled={loading} className="btn-ghast text-xs gap-2 px-5 py-2.5">
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Search size={14} />
            )}
            {loading ? "Searching…" : "Search"}
          </button>
          <button onClick={handleClear} className="btn-ghost gap-1.5">
            <X size={13} /> Clear
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg mb-4"
            style={{ background: "rgba(239,68,68,0.08)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertTriangle size={13} /> {error}
          </motion.div>
        )}
        {message && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs mb-4"
            style={{ color: "#64748B" }}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Results */}
      {customers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Users size={14} style={{ color: "#6366F1" }} />
            <span className="text-xs font-medium" style={{ color: "#94A3B8" }}>
              {customers.length} customer(s) found
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="table-dark w-full text-sm">
              <thead>
                <tr>
                  {["ID", "Name", "Email", "City", "Profession", "Blood Group", "Age"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <motion.tr
                    key={c.customerId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: "#60A5FA" }}>#{c.customerId}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: "#F8FAFC" }}>{c.customerName}</td>
                    <td className="px-4 py-3" style={{ color: "#CBD5E1" }}>{c.customerEmail}</td>
                    <td className="px-4 py-3" style={{ color: "#CBD5E1" }}>{c.city ?? "—"}</td>
                    <td className="px-4 py-3" style={{ color: "#CBD5E1" }}>{c.profession ?? "—"}</td>
                    <td className="px-4 py-3">
                      {c.bloodGroup ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                          {c.bloodGroup}
                        </span>
                      ) : <span style={{ color: "#475569" }}>—</span>}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#CBD5E1" }}>{c.age ?? "—"}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const FilterInput = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div>
    <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: "#94A3B8" }}>
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-indigo"
    />
  </div>
);

export default CustomerSearch;

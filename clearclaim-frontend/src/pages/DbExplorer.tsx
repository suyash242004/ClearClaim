// DbExplorer.tsx
// Standalone Database Explorer — admin "Manage Data" screen
// Full CRUD on the 7 core business tables using ReadAPI + WriteAPI.
// The 3 agent-side tables (patientinterventions, agentlearninglog, agentledger)
// are intentionally NOT here — they are AI-internal and surfaced elsewhere
// (Customer Dashboard care plan, Review Queue, Agent Economics).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readApi, writeApi } from "../services/axiosConfig";
import { AGENT_API_URL } from "../services/AgentHttpService";
import {
  User, FileText, Building2, Shield, ClipboardList,
  Users, Search, Plus, Pencil, Trash2, ArrowLeft,
  Database, X, Save, RefreshCw,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────
interface ColDef {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "date";
  readOnly?: boolean;
  masked?: boolean; // shown as •••• in the grid, editable in the modal
}

interface TableConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  primaryKey: string;
  columns: ColDef[];
  getAll: () => Promise<any>;
  getById: (id: number) => Promise<any>;
  create: (d: any) => Promise<any>;
  update: (id: number, d: any) => Promise<any>;
  remove: (id: number, record?: any) => Promise<any>;
}

// ── Table Configurations ──────────────────────────────────────
const TABLES: TableConfig[] = [
  {
    id: "customer", name: "Customer", icon: <User size={15} />, primaryKey: "customerId",
    columns: [
      { key: "customerId", label: "ID", type: "number", readOnly: true },
      { key: "customerName", label: "Name", type: "text" },
      { key: "customerEmail", label: "Email", type: "text" },
      { key: "customerPhone", label: "Phone", type: "text" },
      { key: "gender", label: "Gender", type: "text" },
      { key: "age", label: "Age", type: "number" },
      { key: "city", label: "City", type: "text" },
      { key: "profession", label: "Profession", type: "text" },
      { key: "bloodGroup", label: "Blood Group", type: "text" },
      { key: "historicalDisease", label: "Disease History", type: "text" },
      { key: "password", label: "Password", type: "text", masked: true },
      { key: "riskScore", label: "Risk Score", type: "number", readOnly: true }, // set by AI risk agent
    ],
    getAll: () => readApi.get("/api/CustomerRead").then(r => r.data),
    getById: (id) => readApi.get(`/api/CustomerRead/${id}`).then(r => r.data),
    create: (d) => writeApi.post("/api/CustomerWrite", d).then(r => r.data),
    update: (id, d) => writeApi.put(`/api/CustomerWrite/${id}`, d).then(r => r.data),
    remove: (id) => writeApi.delete(`/api/CustomerWrite/${id}`).then(r => r.data),
  },
  {
    id: "insuranceplan", name: "Insurance Plan", icon: <FileText size={15} />, primaryKey: "planId",
    columns: [
      { key: "planId", label: "ID", type: "number", readOnly: true },
      { key: "planName", label: "Plan Name", type: "text" },
      { key: "premiumAmount", label: "Premium (₹)", type: "number" },
      { key: "coverageAmount", label: "Coverage (₹)", type: "number" },
      { key: "maxMembers", label: "Max Members", type: "number" },
      { key: "policyDuration", label: "Duration (yr)", type: "number" },
    ],
    getAll: () => readApi.get("/api/InsuranceplanRead").then(r => r.data),
    getById: (id) => readApi.get(`/api/InsuranceplanRead/${id}`).then(r => r.data),
    create: (d) => writeApi.post("/api/InsuranceplanWrite", d).then(r => r.data),
    update: (id, d) => writeApi.put(`/api/InsuranceplanWrite/${id}`, d).then(r => r.data),
    remove: (id) => writeApi.delete(`/api/InsuranceplanWrite/${id}`).then(r => r.data),
  },
  {
    id: "hospital", name: "Hospital", icon: <Building2 size={15} />, primaryKey: "hospitalId",
    columns: [
      { key: "hospitalId", label: "ID", type: "number", readOnly: true },
      { key: "hospitalName", label: "Hospital Name", type: "text" },
      { key: "city", label: "City", type: "text" },
      { key: "isCashless", label: "Cashless", type: "boolean" },
    ],
    getAll: () => readApi.get("/api/HospitalRead").then(r => r.data),
    getById: (id) => readApi.get(`/api/HospitalRead/${id}`).then(r => r.data),
    create: (d) => writeApi.post("/api/HospitalWrite", d).then(r => r.data),
    update: (id, d) => writeApi.put(`/api/HospitalWrite/${id}`, d).then(r => r.data),
    remove: (id) => writeApi.delete(`/api/HospitalWrite/${id}`).then(r => r.data),
  },
  {
    id: "policy", name: "Policy", icon: <Shield size={15} />, primaryKey: "policyId",
    columns: [
      { key: "policyId", label: "Policy ID", type: "number", readOnly: true },
      { key: "customerId", label: "Customer ID", type: "number" },
      { key: "planId", label: "Plan ID", type: "number" },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "endDate", label: "End Date", type: "date" },
      { key: "isActive", label: "Active", type: "boolean" },
      { key: "renewalCount", label: "Renewals", type: "number" },
    ],
    getAll: () => readApi.get("/api/PolicyRead").then(r => r.data),
    getById: (id) => readApi.get(`/api/PolicyRead/${id}`).then(r => r.data),
    create: (d) => writeApi.post("/api/PolicyWrite", d).then(r => r.data),
    update: (id, d) => writeApi.put(`/api/PolicyWrite/${id}`, d).then(r => r.data),
    remove: (id) => writeApi.delete(`/api/PolicyWrite/${id}`).then(r => r.data),
  },
  {
    id: "claim", name: "Claim", icon: <ClipboardList size={15} />, primaryKey: "claimId",
    columns: [
      { key: "claimId", label: "Claim ID", type: "number", readOnly: true },
      { key: "policyId", label: "Policy ID", type: "number" },
      { key: "hospitalId", label: "Hospital ID", type: "number" },
      { key: "claimDate", label: "Date", type: "date" },
      { key: "claimAmount", label: "Amount (₹)", type: "number" },
      { key: "disease", label: "Disease", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "doctorName", label: "Doctor", type: "text" },
      { key: "description", label: "Description", type: "text" },
      // AI agent output columns — written by the Python claim processor, read-only here
      { key: "aiDecision", label: "AI Decision", type: "text", readOnly: true },
      { key: "aiConfidence", label: "AI Confidence", type: "number", readOnly: true },
      { key: "fraudScore", label: "Fraud Score", type: "number", readOnly: true },
      { key: "aiReasoning", label: "AI Reasoning", type: "text", readOnly: true },
      { key: "txHash", label: "Tx Hash", type: "text", readOnly: true },
    ],
    getAll: () => readApi.get("/api/ClaimRead").then(r => r.data),
    getById: (id) => readApi.get(`/api/ClaimRead/${id}`).then(r => r.data),
    create: (d) => writeApi.post("/api/ClaimWrite", d).then(r => r.data),
    update: (id, d) => writeApi.put(`/api/ClaimWrite/${id}`, d).then(r => r.data),
    remove: (id) => writeApi.delete(`/api/ClaimWrite/${id}`).then(r => r.data),
  },
  {
    id: "familymember", name: "Family Member", icon: <Users size={15} />, primaryKey: "memberId",
    columns: [
      { key: "memberId", label: "ID", type: "number", readOnly: true },
      { key: "policyId", label: "Policy ID", type: "number" },
      { key: "memberName", label: "Name", type: "text" },
      { key: "relation", label: "Relation", type: "text" },
      { key: "age", label: "Age", type: "number" },
      { key: "gender", label: "Gender", type: "text" },
    ],
    getAll: () => readApi.get("/api/FamilymemberRead").then(r => r.data),
    getById: (id) => readApi.get(`/api/FamilymemberRead/${id}`).then(r => r.data),
    create: (d) => writeApi.post("/api/FamilymemberWrite", d).then(r => r.data),
    update: (id, d) => writeApi.put(`/api/FamilymemberWrite/${id}`, d).then(r => r.data),
    remove: (id) => writeApi.delete(`/api/FamilymemberWrite/${id}`).then(r => r.data),
  },
  {
    id: "planhospital", name: "Plan Hospital Link", icon: <Database size={15} />, primaryKey: "planId",
    columns: [
      { key: "planId", label: "Plan ID", type: "number" },
      { key: "hospitalId", label: "Hospital ID", type: "number" },
    ],
    getAll: () => writeApi.get("/agent/plan-hospital", { baseURL: AGENT_API_URL }).then(r => r.data),
    getById: (id) => writeApi.get("/agent/plan-hospital", { baseURL: AGENT_API_URL }).then(r => {
       const rec = r.data.records?.find((x: any) => x.planId === id);
       return { record: rec };
    }),
    create: (d) => writeApi.post("/agent/plan-hospital", d, { baseURL: AGENT_API_URL }).then(r => r.data),
    update: (id, d) => writeApi.post("/agent/plan-hospital", d, { baseURL: AGENT_API_URL }).then(r => r.data),
    remove: (id, record) => writeApi.delete(`/agent/plan-hospital/${record.planId}/${record.hospitalId}`, { baseURL: AGENT_API_URL }).then(r => r.data),
  },
];

// ── Helpers ───────────────────────────────────────────────────
const makeEmpty = (cfg: TableConfig): Record<string, any> => {
  const r: Record<string, any> = {};
  cfg.columns.forEach(c => {
    if (c.type === "boolean") r[c.key] = false;
    else if (c.type === "number") r[c.key] = c.readOnly ? 0 : "";
    else if (c.type === "date") r[c.key] = new Date().toISOString().split("T")[0];
    else r[c.key] = "";
  });
  return r;
};

// ── Field Input (used in modal) ───────────────────────────────
const FieldInput = ({
  col, value, onChange,
}: { col: ColDef; value: any; onChange: (v: any) => void }) => {
  const base = "w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  if (col.readOnly)
    return <span className="text-slate-400 text-sm">{value || "auto"}</span>;
  if (col.type === "boolean")
    return (
      <input
        type="checkbox" checked={!!value}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-blue-700"
      />
    );
  if (col.type === "date")
    return <input type="date" value={value ?? ""} onChange={e => onChange(e.target.value)} className={base} />;
  if (col.type === "number")
    return <input type="number" value={value ?? ""} onChange={e => onChange(Number(e.target.value))} className={base} />;
  return <input type="text" value={value ?? ""} onChange={e => onChange(e.target.value)} className={base} />;
};

// ── Record Modal (Add / Edit) ─────────────────────────────────
const RecordModal = ({
  cfg, data, mode, onSave, onClose, saving, error,
}: {
  cfg: TableConfig;
  data: Record<string, any>;
  mode: "add" | "edit";
  onSave: (d: Record<string, any>) => void;
  onClose: () => void;
  saving: boolean;
  error: string;
}) => {
  const [form, setForm] = useState<Record<string, any>>({ ...data });
  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-2xl" style={{ background: "#0A0F1C", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="font-semibold text-base" style={{ color: "#F8FAFC" }}>
            {mode === "add" ? "Add New" : "Edit"} <span className="font-serif-italic font-normal" style={{ color: "#818CF8" }}>{cfg.name}</span>
          </h3>
          <button onClick={onClose} className="btn-ghost !p-1.5">
            <X size={16} />
          </button>
        </div>

        {/* Fields */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {cfg.columns.map(col => (
            <div key={col.key}>
              <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "#94A3B8" }}>
                {col.label}{col.readOnly && <span style={{ color: "#475569" }}> (auto)</span>}
              </label>
              <FieldInput col={col} value={form[col.key]} onChange={v => set(col.key, v)} />
            </div>
          ))}
          {error && (
            <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="btn-ghast text-xs gap-2 px-5 py-2.5"
          >
            {saving
              ? <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              : <Save size={13} />}
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
const DbExplorer = () => {
  const navigate = useNavigate();
  const [tableIdx, setTableIdx] = useState(0);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search by ID
  const [searchId, setSearchId] = useState("");

  // Modal state
  const [modal, setModal] = useState<{ mode: "add" | "edit"; data: Record<string, any> } | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Toast message
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const cfg = TABLES[tableIdx];

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  // Load all records for current table
  const loadAll = async () => {
    setLoading(true); setError(""); setSearchId("");
    try {
      const res = await cfg.getAll();
      setRecords(res.records ?? []);
    } catch (e: any) {
      const errMsg = e.response?.data?.errorMessage || (typeof e.response?.data === 'string' ? e.response.data : "Failed to load data.");
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [tableIdx]);

  // Search by ID
  const handleSearch = async () => {
    const id = Number(searchId);
    if (!id) return;
    setLoading(true); setError("");
    try {
      const res = await cfg.getById(id);
      setRecords(res.record ? [res.record] : []);
      if (!res.record) setError(`No record found with ID ${id}.`);
    } catch {
      setError("Not found.");
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDelete = async (record: any) => {
    const pk = record[cfg.primaryKey];
    if (!confirm(`Delete ${cfg.name} ID ${pk}? This cannot be undone.`)) return;
    try {
      await cfg.remove(pk, record);
      setRecords(prev => prev.filter(r => r !== record));
      showToast("success", `${cfg.name} deleted.`);
    } catch (e: any) {
      const errMsg = e.response?.data?.errorMessage || (typeof e.response?.data === 'string' ? e.response.data : "Delete failed.");
      showToast("error", errMsg);
    }
  };

  // Open edit modal
  const handleEdit = (record: any) => {
    setModalError("");
    setModal({ mode: "edit", data: { ...record } });
  };

  // Open add modal
  const handleAdd = () => {
    setModalError("");
    setModal({ mode: "add", data: makeEmpty(cfg) });
  };

  // Save (add or edit)
  const handleSave = async (formData: Record<string, any>) => {
    setSaving(true); setModalError("");
    try {
      const pk = formData[cfg.primaryKey];
      if (modal!.mode === "edit") {
        const res = await cfg.update(pk, formData);
        const updated = res.record ?? formData;
        setRecords(prev => prev.map(r => r[cfg.primaryKey] === pk ? updated : r));
        showToast("success", `${cfg.name} #${pk} updated.`);
      } else {
        const res = await cfg.create(formData);
        const created = res.record ?? formData;
        setRecords(prev => [created, ...prev]);
        showToast("success", `${cfg.name} added successfully.`);
      }
      setModal(null);
    } catch (e: any) {
      const errMsg = e.response?.data?.errorMessage || (typeof e.response?.data === 'string' ? e.response.data : "Operation failed. Check required fields.");
      setModalError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Render cell value
  const renderCell = (col: ColDef, val: any) => {
    if (col.type === "boolean")
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
          style={val
            ? { background: "rgba(16,185,129,0.1)", color: "#34D399", border: "1px solid rgba(16,185,129,0.2)" }
            : { background: "rgba(255,255,255,0.06)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.1)" }}>
          {val ? "Yes" : "No"}
        </span>
      );
    if (val === null || val === undefined || val === "") return <span style={{ color: "#475569" }}>—</span>;
    if (col.masked) return <span className="font-mono tracking-widest" style={{ color: "#94A3B8" }} title="Hidden — open Edit to view">••••••</span>;
    return <span className="truncate max-w-[140px] block" title={String(val)}>{String(val)}</span>;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-white/10" style={{ background: "#080C14" }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — Table list */}
        <aside className="w-52 flex flex-col p-3 gap-1 shrink-0" style={{
          background: "#0A0F1C",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] px-2 py-1 mb-1" style={{ color: "#475569" }}>Tables</p>
          {TABLES.map((t, i) => {
            const active = i === tableIdx;
            return (
              <button
                key={t.id}
                onClick={() => { setTableIdx(i); setError(""); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-200"
                style={active ? {
                  background: "rgba(99,102,241,0.12)",
                  color: "#F8FAFC",
                  border: "1px solid rgba(99,102,241,0.25)",
                  fontWeight: 500,
                } : {
                  background: "transparent",
                  color: "#94A3B8",
                  border: "1px solid transparent",
                }}
              >
                {t.icon}
                {t.name}
              </button>
            );
          })}
        </aside>

        {/* Main Panel */}
        <main className="flex-1 overflow-auto p-6" style={{ background: "#050810" }}>
          {/* Panel Header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "#F8FAFC" }}>
                {cfg.icon} {cfg.name}
                <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#94A3B8" }}>
                  {records.length} record{records.length !== 1 ? "s" : ""}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search by ID */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Search by ID..."
                  value={searchId}
                  onChange={e => setSearchId(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="input-indigo !py-1.5 w-36"
                />
                <button
                  onClick={handleSearch}
                  className="btn-ghost !p-1.5"
                  title="Search"
                >
                  <Search size={15} />
                </button>
                <button
                  onClick={loadAll}
                  className="btn-ghost !p-1.5"
                  title="Show all / Refresh"
                >
                  <RefreshCw size={15} />
                </button>
              </div>

              {/* Add New */}
              <button
                onClick={handleAdd}
                className="btn-ghast text-xs gap-2 px-4 py-1.5"
              >
                <Plus size={14} /> Add New
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg mb-4"
              style={{ background: "rgba(239,68,68,0.08)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="text-sm py-8 text-center" style={{ color: "#475569" }}>Loading...</div>
          ) : records.length === 0 && !error ? (
            <div className="card p-10 text-center">
              <Database className="mx-auto mb-2" size={28} style={{ color: "#334155" }} />
              <p className="text-sm" style={{ color: "#475569" }}>No records found.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table-dark min-w-full text-sm">
                  <thead>
                    <tr>
                      {cfg.columns.map(col => (
                        <th key={col.key} className="text-left px-4 py-3 text-slate-400 font-medium whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Edit</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec, i) => (
                      <tr key={rec[cfg.primaryKey] ?? i} className="border-b border-white/5 hover:bg-white/5">
                        {cfg.columns.map(col => (
                          <td key={col.key} className="px-4 py-3 max-w-[160px]" style={{ color: "#F8FAFC" }}>
                            {renderCell(col, rec[col.key])}
                          </td>
                        ))}
                        {/* Edit */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleEdit(rec)}
                            className="flex items-center gap-1 text-xs font-medium transition-colors hover:text-indigo-400" style={{ color: "#818CF8" }}
                          >
                            <Pencil size={13} /> Edit
                          </button>
                        </td>
                        {/* Delete */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(rec)}
                            className="flex items-center gap-1 text-xs font-medium transition-colors hover:text-red-400" style={{ color: "#F87171" }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      {modal && (
        <RecordModal
          cfg={cfg}
          data={modal.data}
          mode={modal.mode}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
          error={modalError}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
};

export default DbExplorer;

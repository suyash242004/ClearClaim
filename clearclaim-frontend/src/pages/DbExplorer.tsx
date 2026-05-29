// DbExplorer.tsx
// Standalone Database Explorer — accessible from Login page
// Full CRUD on all 6 tables using ReadAPI + WriteAPI
// No authentication required

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readApi, writeApi } from "../services/axiosConfig";
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
  remove: (id: number) => Promise<any>;
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 text-base">
            {mode === "add" ? "Add New" : "Edit"} {cfg.name}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Fields */}
        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {cfg.columns.map(col => (
            <div key={col.key}>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {col.label}{col.readOnly && " (auto)"}
              </label>
              <FieldInput col={col} value={form[col.key]} onChange={v => set(col.key, v)} />
            </div>
          ))}
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
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
      await cfg.remove(pk);
      setRecords(prev => prev.filter(r => r[cfg.primaryKey] !== pk));
      showToast("success", `${cfg.name} #${pk} deleted.`);
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
      return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${val ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{val ? "Yes" : "No"}</span>;
    if (val === null || val === undefined) return <span className="text-slate-300">—</span>;
    return <span className="truncate max-w-[140px] block">{String(val)}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors"
          >
            <ArrowLeft size={16} /> Back to Login
          </button>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <Database size={18} className="text-blue-700" />
            <span className="font-bold text-slate-800">Database Explorer</span>
            <span className="text-xs text-slate-400 ml-1">ClearClaim</span>
          </div>
        </div>
        <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-medium">
          ⚠ Direct DB access — use carefully
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — Table list */}
        <aside className="w-52 bg-white border-r border-slate-200 flex flex-col p-3 gap-1 shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase px-2 py-1 mb-1">Tables</p>
          {TABLES.map((t, i) => (
            <button
              key={t.id}
              onClick={() => { setTableIdx(i); setError(""); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                i === tableIdx
                  ? "bg-blue-700 text-white font-medium"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.icon}
              {t.name}
            </button>
          ))}
        </aside>

        {/* Main Panel */}
        <main className="flex-1 overflow-auto p-6">
          {/* Panel Header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                {cfg.icon} {cfg.name}
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
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
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  title="Search"
                >
                  <Search size={15} />
                </button>
                <button
                  onClick={loadAll}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  title="Show all / Refresh"
                >
                  <RefreshCw size={15} />
                </button>
              </div>

              {/* Add New */}
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={15} /> Add New
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="text-slate-400 text-sm py-8 text-center">Loading...</div>
          ) : records.length === 0 && !error ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <Database className="mx-auto text-slate-300 mb-2" size={36} />
              <p className="text-slate-400 text-sm">No records found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {cfg.columns.map(col => (
                        <th key={col.key} className="text-left px-4 py-3 text-slate-500 font-medium whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Edit</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec, i) => (
                      <tr key={rec[cfg.primaryKey] ?? i} className="border-b border-slate-100 hover:bg-slate-50">
                        {cfg.columns.map(col => (
                          <td key={col.key} className="px-4 py-3 text-slate-700 max-w-[160px]">
                            {renderCell(col, rec[col.key])}
                          </td>
                        ))}
                        {/* Edit */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleEdit(rec)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                        </td>
                        {/* Delete */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(rec)}
                            className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
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

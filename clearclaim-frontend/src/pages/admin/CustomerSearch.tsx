// CustomerSearch.tsx
// Admin can search customers by city, profession, blood group, disease
// GET /api/admin/customers/search

import { useState } from "react";
import AdminHttpService from "../../services/AdminHttpService";
import type { Customer } from "../../models/Customer";
import { Search, Users } from "lucide-react";

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

  // Clear all filters and results
  const handleClear = () => {
    setCity("");
    setProfession("");
    setBloodGroup("");
    setDisease("");
    setCustomers([]);
    setError("");
    setMessage("");
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        Customer Search
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Search customers by city, profession, blood group or disease.
      </p>

      {/* Search Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-sm text-slate-500 mb-1 block">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Pune"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-1 block">
              Profession
            </label>
            <input
              type="text"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="e.g. Doctor"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-1 block">
              Blood Group
            </label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Any --</option>
              {[
                "A+ve",
                "A-ve",
                "B+ve",
                "B-ve",
                "O+ve",
                "O-ve",
                "AB+ve",
                "AB-ve",
              ].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-1 block">Disease</label>
            <input
              type="text"
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              placeholder="e.g. Diabetes"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Search size={16} />
            {loading ? "Searching..." : "Search"}
          </button>
          <button
            onClick={handleClear}
            className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {message && <p className="text-slate-400 text-sm mb-4">{message}</p>}

      {/* Results */}
      {customers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <span className="text-sm text-slate-500">
              {customers.length} customer(s) found
            </span>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  ID
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  City
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Profession
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Blood Group
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Age
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.customerId}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-700">{c.customerId}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {c.customerName}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.customerEmail}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.city ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.profession ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.bloodGroup ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.age ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerSearch;

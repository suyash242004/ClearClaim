// HospitalClaims.tsx
// First (and only) page the hospital role sees after login
// Shows all claims submitted at this hospital
// Allows filtering by status — All / Pending / Approved / Rejected
// Uses HospitalHttpService — GET /api/hospital/{id}/claims
//                          — GET /api/hospital/{id}/claims/{status}

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import HospitalHttpService from "../../services/HospitalHttpService";
import type { Claim } from "../../models/Claim";
import { ClipboardList, IndianRupee, CheckSquare, Clock, XSquare } from "lucide-react";

// Status filter options
type StatusFilter = "All" | "Pending" | "Approved" | "Rejected";

const HospitalClaims = () => {
  const { userId } = useSelector((state: RootState) => state.auth);

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("All");

  // Fetch claims — all or by status depending on active filter
  const fetchClaims = async (filter: StatusFilter) => {
    setLoading(true);
    setError("");
    setClaims([]); // clear stale data from previous filter
    try {
      let res;
      if (filter === "All") {
        res = await HospitalHttpService.getClaims(userId!);
      } else {
        res = await HospitalHttpService.getClaimsByStatus(userId!, filter);
      }
      setClaims(res.records ?? []); // safely handle null records from backend
    } catch {
      setError("Failed to load claims.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and whenever filter changes
  useEffect(() => {
    fetchClaims(activeFilter);
  }, [activeFilter, userId]);

  // Status badge color — same helper as MyClaims
  const statusColor = (status?: string) => {
    if (status === "Approved") return "bg-green-100 text-green-700";
    if (status === "Rejected") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-700";
  };

  // Derive stat counts from ALL loaded claims for summary cards
  // (only meaningful when filter = "All", otherwise just shows filtered count)
  const totalClaims = claims.length;
  const pendingCount = claims.filter((c) => c.status === "Pending").length;
  const approvedCount = claims.filter((c) => c.status === "Approved").length;
  const rejectedCount = claims.filter((c) => c.status === "Rejected").length;

  // Filter tab config
  const filters: { key: StatusFilter; label: string }[] = [
    { key: "All", label: "All" },
    { key: "Pending", label: "Pending" },
    { key: "Approved", label: "Approved" },
    { key: "Rejected", label: "Rejected" },
  ];

  return (
    <div>
      {/* Page Header */}
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        Hospital Claims
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        View all insurance claims submitted at your hospital.
      </p>

      {/* Stat Cards — only meaningful on "All" filter */}
      {activeFilter === "All" && !loading && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Total */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <ClipboardList className="text-blue-700" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalClaims}</p>
              <p className="text-sm text-slate-500">Total Claims</p>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="bg-amber-50 p-3 rounded-lg">
              <Clock className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
              <p className="text-sm text-slate-500">Pending</p>
            </div>
          </div>

          {/* Approved */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckSquare className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {approvedCount}
              </p>
              <p className="text-sm text-slate-500">Approved</p>
            </div>
          </div>

          {/* Rejected */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="bg-red-50 p-3 rounded-lg">
              <XSquare className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {rejectedCount}
              </p>
              <p className="text-sm text-slate-500">Rejected</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                activeFilter === f.key
                  ? "bg-blue-700 text-white"
                  : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Loading */}
      {loading ? (
        <div className="text-slate-500 text-sm">Loading...</div>
      ) : claims.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <ClipboardList className="mx-auto text-slate-300 mb-2" size={36} />
          <p className="text-slate-400 text-sm">
            No {activeFilter !== "All" ? activeFilter.toLowerCase() + " " : ""}
            claims found.
          </p>
        </div>
      ) : (
        /* Claims Table */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Claim ID
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Policy ID
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Disease
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Doctor
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Amount (₹)
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr
                  key={claim.claimId}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    #{claim.claimId}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{claim.policyId}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {claim.disease ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {claim.doctorName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 flex items-center gap-1">
                    <IndianRupee size={13} className="text-slate-500" />
                    {claim.claimAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{claim.claimDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(claim.status)}`}
                    >
                      {claim.status ?? "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Table footer — total amount for filtered view */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <p className="text-xs text-slate-400">
              Showing {claims.length} claim{claims.length !== 1 ? "s" : ""}
              {activeFilter !== "All" ? ` · ${activeFilter}` : ""}
            </p>
            <p className="text-xs text-slate-600 font-medium">
              Total:{" "}
              <span className="text-slate-800 font-semibold">
                ₹
                {claims
                  .reduce((sum, c) => sum + c.claimAmount, 0)
                  .toLocaleString()}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalClaims;

// PendingClaims.tsx
// Admin can view all pending claims and approve or reject them
// GET /api/admin/claims/pending
// PUT /api/admin/claims/approve/:id
// PUT /api/admin/claims/reject/:id

import { useEffect, useState } from "react";
import ClaimHttpService from "../../services/ClaimHttpService";
import type { Claim } from "../../models/Claim";
import { CheckSquare, XSquare, ClipboardList } from "lucide-react";

const PendingClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Fetch pending claims on mount
  const fetchPendingClaims = async () => {
    try {
      const res = await ClaimHttpService.getPending();
      setClaims(res.records ?? []);
    } catch {
      setError("Failed to load pending claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingClaims();
  }, []);

  // Approve a claim
  const handleApprove = async (claimId: number) => {
    try {
      const res = await ClaimHttpService.approve(claimId);
      setActionMessage(res.message);
      // Refresh list after action
      fetchPendingClaims();
    } catch (err: any) {
      const errMsg = err.response?.data?.errorMessage || (typeof err.response?.data === 'string' ? err.response.data : "Approve failed.");
      setActionMessage(errMsg);
    }
  };

  // Reject a claim
  const handleReject = async (claimId: number) => {
    try {
      const res = await ClaimHttpService.reject(claimId);
      setActionMessage(res.message);
      // Refresh list after action
      fetchPendingClaims();
    } catch (err: any) {
      const errMsg = err.response?.data?.errorMessage || (typeof err.response?.data === 'string' ? err.response.data : "Reject failed.");
      setActionMessage(errMsg);
    }
  };

  if (loading) return <div className="text-slate-500 text-sm">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        Pending Claims
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Review and approve or reject pending insurance claims.
      </p>

      {/* Action feedback message */}
      {actionMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
          {actionMessage}
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {claims.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <ClipboardList className="mx-auto text-slate-300 mb-2" size={36} />
          <p className="text-slate-400 text-sm">
            No pending claims at the moment.
          </p>
        </div>
      ) : (
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
                  Hospital ID
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Disease
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Amount (₹)
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Doctor
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr
                  key={claim.claimId}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-700">{claim.claimId}</td>
                  <td className="px-4 py-3 text-slate-700">{claim.policyId}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {claim.hospitalId}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{claim.disease}</td>
                  <td className="px-4 py-3 text-slate-700">
                    ₹{claim.claimAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {claim.doctorName}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {claim.claimDate}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {/* Approve Button */}
                    <button
                      onClick={() => handleApprove(claim.claimId)}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-lg transition-colors"
                    >
                      <CheckSquare size={14} />
                      Approve
                    </button>

                    {/* Reject Button */}
                    <button
                      onClick={() => handleReject(claim.claimId)}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-lg transition-colors"
                    >
                      <XSquare size={14} />
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PendingClaims;

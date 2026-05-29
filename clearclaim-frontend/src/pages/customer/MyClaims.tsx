// MyClaims.tsx
// Shows all claims raised by the logged in customer
// Status shown with color badge — Pending / Approved / Rejected

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import ClaimHttpService from "../../services/ClaimHttpService";
import type { Claim } from "../../models/Claim";
import { ClipboardList } from "lucide-react";

const MyClaims = () => {
  const { userId } = useSelector((state: RootState) => state.auth);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const res = await ClaimHttpService.getByCustomer(userId!);
        setClaims(res.records ?? []);
      } catch {
        setClaims([]); // new customer has no claims — show empty state, not error
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, [userId]);

  // Status badge color
  const statusColor = (status?: string) => {
    if (status === "Approved") return "bg-green-100 text-green-700";
    if (status === "Rejected") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-700";
  };

  if (loading) return <div className="text-slate-500 text-sm">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">My Claims</h2>
      <p className="text-slate-500 text-sm mb-6">
        Track all your submitted insurance claims.
      </p>


      {claims.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <ClipboardList className="mx-auto text-slate-300 mb-2" size={36} />
          <p className="text-slate-400 text-sm">No claims found.</p>
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
                  <td className="px-4 py-3 text-slate-700">{claim.claimId}</td>
                  <td className="px-4 py-3 text-slate-700">{claim.policyId}</td>
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
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(claim.status)}`}
                    >
                      {claim.status}
                    </span>
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

export default MyClaims;

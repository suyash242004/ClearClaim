// MyClaims.tsx
// Shows all claims raised by the logged in customer
// Status shown with color badge — Pending / Approved / Rejected

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import ClaimHttpService from "../../services/ClaimHttpService";
import type { Claim } from "../../models/Claim";
import { ClipboardList } from "lucide-react";
import ClaimStatusChip from "../../components/ClaimStatusChip";
import TxHashLink from "../../components/TxHashLink";

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


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">My Claims</h2>
      <p className="text-slate-400 text-sm mb-6">
        Track all your submitted insurance claims.
      </p>


      {claims.length === 0 ? (
        <div className="card p-8 text-center">
          <ClipboardList className="mx-auto text-slate-500 mb-2" size={36} />
          <p className="text-slate-400 text-sm">No claims found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table-dark w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Claim ID</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Policy ID</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Disease</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Amount (₹)</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Doctor</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">AI Decision</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr
                  key={claim.claimId}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="px-4 py-3 text-white font-mono font-bold">#{claim.claimId}</td>
                  <td className="px-4 py-3 text-slate-300">{claim.policyId}</td>
                  <td className="px-4 py-3 text-slate-300">{claim.disease}</td>
                  <td className="px-4 py-3 text-slate-300">
                    ₹{claim.claimAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {claim.doctorName}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {claim.claimDate}
                  </td>
                  <td className="px-4 py-3">
                    {claim.aiDecision ? (
                      <ClaimStatusChip status={claim.aiDecision as string} />
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ClaimStatusChip status={claim.status as string} />
                  </td>
                  <td className="px-4 py-3">
                    {claim.txHash ? (
                      <TxHashLink hash={claim.txHash} />
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
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

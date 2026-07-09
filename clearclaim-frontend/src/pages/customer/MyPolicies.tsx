// MyPolicies.tsx
// Shows all policies of the logged in customer
// Fetched using customer tracking business API

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import PolicyHttpService from "../../services/PolicyHttpService";
import type { Policy } from "../../models/Policy";
import { FileText } from "lucide-react";

const MyPolicies = () => {
  const { userId } = useSelector((state: RootState) => state.auth);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await PolicyHttpService.getByCustomer(userId!);
        setPolicies(res.records ?? []);
      } catch {
        setPolicies([]); // new customer has no policies — show empty state, not error
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
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
      <h2 className="text-xl font-semibold text-white mb-1">My Policies</h2>
      <p className="text-slate-400 text-sm mb-6">
        All your insurance policies.
      </p>


      {policies.length === 0 ? (
        <div className="card p-8 text-center">
          <FileText className="mx-auto text-slate-500 mb-2" size={36} />
          <p className="text-slate-400 text-sm">No policies found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table-dark w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Policy ID</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Plan ID</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Start Date</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">End Date</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Renewals</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr
                  key={policy.policyId}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="px-4 py-3 text-white font-mono font-bold">
                    #{policy.policyId}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{policy.planId}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {policy.startDate}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{policy.endDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${policy.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-white/5 text-slate-400"}`}
                    >
                      {policy.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {policy.renewalCount}
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

export default MyPolicies;

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

  if (loading) return <div className="text-slate-500 text-sm">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">My Policies</h2>
      <p className="text-slate-500 text-sm mb-6">
        All your insurance policies.
      </p>


      {policies.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <FileText className="mx-auto text-slate-300 mb-2" size={36} />
          <p className="text-slate-400 text-sm">No policies found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Policy ID
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Plan ID
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Start Date
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  End Date
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Renewals
                </th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr
                  key={policy.policyId}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-700">
                    {policy.policyId}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{policy.planId}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {policy.startDate}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{policy.endDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${policy.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {policy.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
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

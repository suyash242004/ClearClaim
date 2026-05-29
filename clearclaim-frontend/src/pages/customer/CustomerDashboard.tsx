// CustomerDashboard.tsx
// First page customer sees after login
// Shows customer details and quick summary of their policies and claims

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import CustomerHttpService from "../../services/CustomerHttpService";
import PolicyHttpService from "../../services/PolicyHttpService";
import ClaimHttpService from "../../services/ClaimHttpService";
import type { Customer } from "../../models/Customer";
import type { Policy } from "../../models/Policy";
import type { Claim } from "../../models/Claim";
import { User, FileText, ClipboardList } from "lucide-react";

const CustomerDashboard = () => {
  const { userId } = useSelector((state: RootState) => state.auth);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      // Customer profile — critical, show error if this fails
      try {
        const custRes = await CustomerHttpService.getById(userId!);
        setCustomer(custRes.record);
      } catch {
        setError("Failed to load customer profile.");
        setLoading(false);
        return;
      }

      // Policies — non-critical, new customer may have none
      try {
        const polRes = await PolicyHttpService.getByCustomer(userId!);
        setPolicies(polRes.records ?? []);
      } catch {
        setPolicies([]); // silently default to empty — new customer has no policies
      }

      // Claims — non-critical, new customer may have none
      try {
        const claimRes = await ClaimHttpService.getByCustomer(userId!);
        setClaims(claimRes.records ?? []);
      } catch {
        setClaims([]); // silently default to empty — new customer has no claims
      }

      setLoading(false);
    };
    fetchData();
  }, [userId]);

  if (loading) return <div className="text-slate-500 text-sm">Loading...</div>;
  if (error) return <div className="text-red-500 text-sm">{error}</div>;

  // Count claims by status
  const pendingClaims = claims.filter((c) => c.status === "Pending").length;
  const approvedClaims = claims.filter((c) => c.status === "Approved").length;
  const activePolicies = policies.filter((p) => p.isActive).length;

  return (
    <div>
      {/* Page Header */}
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        Welcome, {customer?.customerName}
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Here is a summary of your insurance account.
      </p>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <FileText className="text-blue-700" size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">
              {activePolicies}
            </p>
            <p className="text-sm text-slate-500">Active Policies</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-lg">
            <ClipboardList className="text-amber-600" size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{pendingClaims}</p>
            <p className="text-sm text-slate-500">Pending Claims</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <ClipboardList className="text-green-600" size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">
              {approvedClaims}
            </p>
            <p className="text-sm text-slate-500">Approved Claims</p>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-blue-700" />
          <h3 className="text-slate-800 font-semibold">Profile Details</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Email</p>
            <p className="text-slate-700">{customer?.customerEmail}</p>
          </div>
          <div>
            <p className="text-slate-400">Phone</p>
            <p className="text-slate-700">{customer?.customerPhone}</p>
          </div>
          <div>
            <p className="text-slate-400">City</p>
            <p className="text-slate-700">{customer?.city ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Profession</p>
            <p className="text-slate-700">{customer?.profession ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Blood Group</p>
            <p className="text-slate-700">{customer?.bloodGroup ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Age</p>
            <p className="text-slate-700">{customer?.age ?? "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;

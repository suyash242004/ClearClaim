// AdminDashboard.tsx
// First page admin sees after login
// Shows real statistics fetched from backend business API
// GET /api/admin/dashboard

import { useEffect, useState } from "react";
import AdminHttpService from "../../services/AdminHttpService";
import type { DashboardStats } from "../../models/DashboardStats";
import {
  Users,
  FileText,
  ClipboardList,
  CheckSquare,
  XSquare,
  Building2,
  IndianRupee,
  LayoutDashboard,
} from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await AdminHttpService.getDashboardStats();
        setStats(res.record);
      } catch {
        setError("Failed to load dashboard stats.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-slate-500 text-sm">Loading...</div>;
  if (error) return <div className="text-red-500 text-sm">{error}</div>;

  // Stat card data
  const statCards = [
    {
      label: "Total Customers",
      value: stats?.totalCustomers,
      icon: <Users size={20} className="text-blue-700" />,
      bg: "bg-blue-50",
    },
    {
      label: "Active Policies",
      value: stats?.activePolicies,
      icon: <FileText size={20} className="text-sky-600" />,
      bg: "bg-sky-50",
    },
    {
      label: "Pending Claims",
      value: stats?.pendingClaims,
      icon: <ClipboardList size={20} className="text-amber-600" />,
      bg: "bg-amber-50",
    },
    {
      label: "Approved Claims",
      value: stats?.approvedClaims,
      icon: <CheckSquare size={20} className="text-green-600" />,
      bg: "bg-green-50",
    },
    {
      label: "Rejected Claims",
      value: stats?.rejectedClaims,
      icon: <XSquare size={20} className="text-red-600" />,
      bg: "bg-red-50",
    },
    {
      label: "Total Hospitals",
      value: stats?.totalHospitals,
      icon: <Building2 size={20} className="text-purple-600" />,
      bg: "bg-purple-50",
    },
    {
      label: "Total Plans",
      value: stats?.totalPlans,
      icon: <LayoutDashboard size={20} className="text-indigo-600" />,
      bg: "bg-indigo-50",
    },
    {
      label: "Total Revenue (₹)",
      value: (stats?.totalRevenue ?? 0).toLocaleString(),
      icon: <IndianRupee size={20} className="text-emerald-600" />,
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        Admin Dashboard
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Real-time overview of the insurance portal.
      </p>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4"
          >
            <div className={`${card.bg} p-3 rounded-lg`}>{card.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{card.value}</p>
              <p className="text-xs text-slate-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;

// ManageData.tsx
// Admin can view all data tables — Customers, Hospitals, Plans, Policies, Claims
// Basic read-only view of all data for admin reference

import { useEffect, useState } from "react";
import CustomerHttpService from "../../services/CustomerHttpService";
import HospitalHttpService from "../../services/HospitalHttpService";
import InsuranceplanHttpService from "../../services/InsuranceplanHttpService";
import type { Customer } from "../../models/Customer";
import type { Hospital } from "../../models/Hospital";
import type { Insuranceplan } from "../../models/Insuranceplan";
import { Database } from "lucide-react";

// Tab type
type Tab = "customers" | "hospitals" | "plans";

const ManageData = () => {
  const [activeTab, setActiveTab] = useState<Tab>("customers");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [plans, setPlans] = useState<Insuranceplan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch data based on active tab
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        if (activeTab === "customers") {
          const res = await CustomerHttpService.getAll();
          setCustomers(res.records);
        } else if (activeTab === "hospitals") {
          const res = await HospitalHttpService.getAll();
          setHospitals(res.records);
        } else if (activeTab === "plans") {
          const res = await InsuranceplanHttpService.getAll();
          setPlans(res.records);
        }
      } catch {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "customers", label: "Customers" },
    { key: "hospitals", label: "Hospitals" },
    { key: "plans", label: "Insurance Plans" },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Manage Data</h2>
      <p className="text-slate-500 text-sm mb-6">
        View all records in the system.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                activeTab === tab.key
                  ? "bg-blue-700 text-white"
                  : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-slate-500 text-sm">Loading...</div>}
      {error && <div className="text-red-500 text-sm">{error}</div>}

      {/* Customers Table */}
      {activeTab === "customers" && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                  Phone
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  City
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
                  <td className="px-4 py-3 text-slate-700">
                    {c.customerPhone}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.city ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{c.age ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Hospitals Table */}
      {activeTab === "hospitals" && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  ID
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Hospital Name
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  City
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Cashless
                </th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map((h) => (
                <tr
                  key={h.hospitalId}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-700">{h.hospitalId}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {h.hospitalName}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{h.city}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium
                      ${
                        h.isCashless
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {h.isCashless ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plans Table */}
      {activeTab === "plans" && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  ID
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Plan Name
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Premium (₹)
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Coverage (₹)
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Max Members
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr
                  key={p.planId}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-700">{p.planId}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {p.planName}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    ₹{p.premiumAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    ₹{p.coverageAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.maxMembers}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {p.policyDuration} yr
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

export default ManageData;

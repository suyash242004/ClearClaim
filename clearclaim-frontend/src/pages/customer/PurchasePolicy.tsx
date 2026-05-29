// PurchasePolicy.tsx
// Customer can purchase a new insurance policy
// Selects plan from dropdown and enters start date
// End date is auto calculated by backend

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import InsuranceplanHttpService from "../../services/InsuranceplanHttpService";
import PolicyHttpService from "../../services/PolicyHttpService";
import type { Insuranceplan } from "../../models/Insuranceplan";
import { ShoppingCart } from "lucide-react";

const PurchasePolicy = () => {
  const { userId } = useSelector((state: RootState) => state.auth);

  const [plans, setPlans] = useState<Insuranceplan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Load all plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await InsuranceplanHttpService.getAll();
        setPlans(res.records ?? []);
      } catch {
        setError("Failed to load plans.");
      }
    };
    fetchPlans();
  }, []);

  const handlePurchase = async () => {
    setError("");
    setSuccess("");

    if (!selectedPlan) {
      setError("Please select a plan.");
      return;
    }
    if (!startDate) {
      setError("Please select a start date.");
      return;
    }

    setLoading(true);
    try {
      const res = await PolicyHttpService.purchase(
        userId!,
        Number(selectedPlan),
        startDate,
      );
      setSuccess(res.message);
    } catch (err: any) {
      const errMsg = err.response?.data?.errorMessage || (typeof err.response?.data === 'string' ? err.response.data : "Purchase failed.");
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        Purchase Policy
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Select a plan and choose your start date.
      </p>

      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg">
        {/* Plan Selection */}
        <div className="mb-4">
          <label className="block text-sm text-slate-600 mb-1">
            Select Plan
          </label>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Choose a Plan --</option>
            {plans.map((plan) => (
              <option key={plan.planId} value={plan.planId}>
                {plan.planName} — ₹{plan.premiumAmount.toLocaleString()} / yr
              </option>
            ))}
          </select>
        </div>

        {/* Show plan details if selected */}
        {selectedPlan && (
          <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm text-slate-600">
            {(() => {
              const plan = plans.find((p) => p.planId === Number(selectedPlan));
              if (!plan) return null;
              return (
                <>
                  <p>
                    Coverage:{" "}
                    <span className="font-medium text-slate-800">
                      ₹{plan.coverageAmount.toLocaleString()}
                    </span>
                  </p>
                  <p>
                    Max Members:{" "}
                    <span className="font-medium text-slate-800">
                      {plan.maxMembers}
                    </span>
                  </p>
                  <p>
                    Duration:{" "}
                    <span className="font-medium text-slate-800">
                      {plan.policyDuration} year(s)
                    </span>
                  </p>
                </>
              );
            })()}
          </div>
        )}

        {/* Start Date */}
        <div className="mb-6">
          <label className="block text-sm text-slate-600 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            End date will be auto calculated based on plan duration.
          </p>
        </div>

        {/* Error / Success */}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-4">{success}</p>}

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-5 py-2 rounded-lg transition-colors"
        >
          <ShoppingCart size={16} />
          {loading ? "Processing..." : "Purchase Policy"}
        </button>
      </div>
    </div>
  );
};

export default PurchasePolicy;

// BrowsePlans.tsx
// Customer can search, view hospitals, and compare insurance plans
// Compare uses: GET /api/plans/compare?planIds=1&planIds=2
// Supports selecting 2-4 plans for side-by-side comparison

import { useState } from "react";
import PlanSearchHttpService from "../../services/PlanSearchHttpService";
import type { Insuranceplan } from "../../models/Insuranceplan";
import type { Hospital } from "../../models/Hospital";
import { Search, GitCompareArrows, X, CheckCircle, IndianRupee } from "lucide-react";

const BrowsePlans = () => {
  // --- Search ---
  const [city, setCity] = useState("");
  const [maxPremium, setMaxPremium] = useState("");
  const [minCoverage, setMinCoverage] = useState("");
  const [plans, setPlans] = useState<Insuranceplan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // --- Hospitals panel ---
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  // --- Compare ---
  const [comparePlanIds, setComparePlanIds] = useState<number[]>([]);
  const [compareResults, setCompareResults] = useState<Insuranceplan[]>([]);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");

  // Search plans
  const handleSearch = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    setCompareResults([]);
    setComparePlanIds([]);
    try {
      const res = await PlanSearchHttpService.searchPlans(
        city || undefined,
        maxPremium ? Number(maxPremium) : undefined,
        minCoverage ? Number(minCoverage) : undefined,
      );
      setPlans(res.records ?? []);
      if ((res.records ?? []).length === 0)
        setMessage("No plans found for given filters.");
    } 
    catch (err: any) {
      setError(err.response?.data || "Search failed.");
    } 
    finally {
      setLoading(false);
    }
  };

  // View hospitals for a plan
  const handleViewHospitals = async (planId: number) => {
    if (selectedPlanId === planId) {
      setSelectedPlanId(null);
      setHospitals([]);
      return;
    }
    setSelectedPlanId(planId);
    try {
      const res = await PlanSearchHttpService.getHospitalsByPlan(planId);
      setHospitals(res.records ?? []);
    } catch {
      setHospitals([]);
    }
  };

  // Toggle plan selection for compare (max 4)
  const toggleCompare = (planId: number) => {
    setComparePlanIds((prev) => {
      if (prev.includes(planId)) return prev.filter((id) => id !== planId);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, planId];
    });
    setCompareResults([]); // reset previous comparison
    setCompareError("");
  };

  // Run comparison
  const handleCompare = async () => {
    if (comparePlanIds.length < 2) return;
    setComparing(true);
    setCompareError("");
    setCompareResults([]);
    try {
      const res = await PlanSearchHttpService.comparePlans(comparePlanIds);
      setCompareResults(res.records ?? []);
    } catch (err: any) {
      setCompareError(err.response?.data || "Comparison failed.");
    } finally {
      setComparing(false);
    }
  };

  // Highlight best value in comparison (lowest premium, highest coverage, most members)
  const getBestPremium = () => Math.min(...compareResults.map((p) => p.premiumAmount));
  const getBestCoverage = () => Math.max(...compareResults.map((p) => p.coverageAmount));
  const getBestMembers = () => Math.max(...compareResults.map((p) => p.maxMembers));

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Browse Plans</h2>
      <p className="text-slate-500 text-sm mb-6">
        Search, explore and compare insurance plans side by side.
      </p>

      {/* Search Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm text-slate-500 mb-1 block">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Pune"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-1 block">Max Premium (₹)</label>
            <input
              type="number"
              value={maxPremium}
              onChange={(e) => setMaxPremium(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-1 block">Min Coverage (₹)</label>
            <input
              type="number"
              value={minCoverage}
              onChange={(e) => setMinCoverage(e.target.value)}
              placeholder="e.g. 500000"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Search size={16} />
          {loading ? "Searching..." : "Search Plans"}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {message && <p className="text-slate-400 text-sm mb-4">{message}</p>}

      {/* Plans Table */}
      {plans.length > 0 && (
        <>
          {/* Compare action bar — floats above table when plans are selected */}
          {comparePlanIds.length > 0 && (
            <div className="flex items-center justify-between bg-blue-700 text-white px-5 py-3 rounded-xl mb-3">
              <div className="flex items-center gap-2 text-sm">
                <GitCompareArrows size={18} />
                <span>
                  <span className="font-semibold">{comparePlanIds.length}</span>{" "}
                  plan{comparePlanIds.length > 1 ? "s" : ""} selected for comparison
                  {comparePlanIds.length < 2 && " — select at least 2"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCompare}
                  disabled={comparePlanIds.length < 2 || comparing}
                  className="bg-white text-blue-700 font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  {comparing ? "Comparing..." : "Compare Now"}
                </button>
                <button
                  onClick={() => { setComparePlanIds([]); setCompareResults([]); }}
                  className="text-blue-200 hover:text-white text-sm px-2 py-1.5"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium w-8">
                    Compare
                  </th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Plan Name</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Premium (₹)</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Coverage (₹)</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Max Members</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Duration</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Hospitals</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const isChecked = comparePlanIds.includes(plan.planId);
                  const isDisabled = !isChecked && comparePlanIds.length >= 4;
                  return (
                    <tr
                      key={plan.planId}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${isChecked ? "bg-blue-50/40" : ""}`}
                    >
                      {/* Compare checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={() => toggleCompare(plan.planId)}
                          className="w-4 h-4 accent-blue-700 cursor-pointer disabled:opacity-30"
                          title={isDisabled ? "Max 4 plans for comparison" : "Add to compare"}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{plan.planName}</td>
                      <td className="px-4 py-3 text-slate-700">₹{plan.premiumAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">₹{plan.coverageAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">{plan.maxMembers}</td>
                      <td className="px-4 py-3 text-slate-700">{plan.policyDuration} yr</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleViewHospitals(plan.planId)}
                          className={`text-xs font-medium transition-colors ${selectedPlanId === plan.planId ? "text-blue-700 underline" : "text-blue-500 hover:underline"}`}
                        >
                          {selectedPlanId === plan.planId ? "Hide" : "View Hospitals"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Hospitals under selected plan */}
      {selectedPlanId && hospitals.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="text-slate-700 font-semibold mb-3 text-sm">
            Hospitals covered under Plan ID {selectedPlanId}
          </h3>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">Hospital Name</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">City</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">Cashless</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map((h) => (
                <tr key={h.hospitalId} className="border-b border-slate-100">
                  <td className="px-4 py-2 text-slate-700">{h.hospitalName}</td>
                  <td className="px-4 py-2 text-slate-700">{h.city}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${h.isCashless ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {h.isCashless ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Compare Error */}
      {compareError && (
        <p className="text-red-500 text-sm mb-4">{compareError}</p>
      )}

      {/* Side-by-Side Comparison Table */}
      {compareResults.length >= 2 && (
        <div className="bg-white rounded-xl border border-blue-200 overflow-hidden mb-6">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-blue-50">
            <div className="flex items-center gap-2">
              <GitCompareArrows size={18} className="text-blue-700" />
              <h3 className="text-blue-800 font-semibold text-sm">
                Plan Comparison
              </h3>
              <span className="text-xs text-blue-500">
                ({compareResults.length} plans)
              </span>
            </div>
            <button
              onClick={() => { setCompareResults([]); setComparePlanIds([]); }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          {/* Comparison grid */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium w-40">
                    Feature
                  </th>
                  {compareResults.map((plan) => (
                    <th key={plan.planId} className="text-left px-5 py-3 text-slate-700 font-semibold">
                      {plan.planName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Premium */}
                <tr className="border-b border-slate-100">
                  <td className="px-5 py-3 text-slate-500 font-medium">Premium / yr</td>
                  {compareResults.map((plan) => (
                    <td key={plan.planId} className="px-5 py-3">
                      <span className={`font-semibold flex items-center gap-1 ${plan.premiumAmount === getBestPremium() ? "text-green-600" : "text-slate-700"}`}>
                        <IndianRupee size={13} />
                        {plan.premiumAmount.toLocaleString()}
                        {plan.premiumAmount === getBestPremium() && (
                          <CheckCircle size={14} className="text-green-500" title="Lowest premium" />
                        )}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Coverage */}
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <td className="px-5 py-3 text-slate-500 font-medium">Coverage</td>
                  {compareResults.map((plan) => (
                    <td key={plan.planId} className="px-5 py-3">
                      <span className={`font-semibold flex items-center gap-1 ${plan.coverageAmount === getBestCoverage() ? "text-green-600" : "text-slate-700"}`}>
                        <IndianRupee size={13} />
                        {plan.coverageAmount.toLocaleString()}
                        {plan.coverageAmount === getBestCoverage() && (
                          <CheckCircle size={14} className="text-green-500" title="Highest coverage" />
                        )}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Max Members */}
                <tr className="border-b border-slate-100">
                  <td className="px-5 py-3 text-slate-500 font-medium">Max Members</td>
                  {compareResults.map((plan) => (
                    <td key={plan.planId} className="px-5 py-3">
                      <span className={`font-semibold flex items-center gap-1 ${plan.maxMembers === getBestMembers() ? "text-green-600" : "text-slate-700"}`}>
                        {plan.maxMembers}
                        {plan.maxMembers === getBestMembers() && (
                          <CheckCircle size={14} className="text-green-500" title="Most members" />
                        )}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Duration */}
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <td className="px-5 py-3 text-slate-500 font-medium">Duration</td>
                  {compareResults.map((plan) => (
                    <td key={plan.planId} className="px-5 py-3 text-slate-700 font-semibold">
                      {plan.policyDuration} yr
                    </td>
                  ))}
                </tr>

                {/* Value score = coverage / premium */}
                <tr>
                  <td className="px-5 py-3 text-slate-500 font-medium">
                    Value Score
                    <p className="text-xs text-slate-400 font-normal">Coverage ÷ Premium</p>
                  </td>
                  {compareResults.map((plan) => {
                    const score = Math.round(plan.coverageAmount / plan.premiumAmount);
                    const bestScore = Math.max(...compareResults.map((p) => Math.round(p.coverageAmount / p.premiumAmount)));
                    return (
                      <td key={plan.planId} className="px-5 py-3">
                        <span className={`font-semibold flex items-center gap-1 ${score === bestScore ? "text-green-600" : "text-slate-700"}`}>
                          {score}x
                          {score === bestScore && (
                            <CheckCircle size={14} className="text-green-500" title="Best value" />
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            <CheckCircle size={13} className="text-green-500" />
            <span className="text-xs text-slate-400">= Best value in this row</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowsePlans;

// SubmitClaim.tsx
// Customer submits a new insurance claim
// Selects active policy and hospital, fills claim details
// Backend triggers validate hospital coverage, amount limit etc.

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import PolicyHttpService from "../../services/PolicyHttpService";
import HospitalHttpService from "../../services/HospitalHttpService";
import ClaimHttpService from "../../services/ClaimHttpService";
import PlanSearchHttpService from "../../services/PlanSearchHttpService";
import type { Policy } from "../../models/Policy";
import type { Hospital } from "../../models/Hospital";
import { ClipboardList } from "lucide-react";

const SubmitClaim = () => {
  const { userId } = useSelector((state: RootState) => state.auth);

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);

  const [policyId, setPolicyId] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [disease, setDisease] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Load customer policies on mount
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const polRes = await PolicyHttpService.getByCustomer(userId!);
        setPolicies((polRes.records ?? []).filter((p) => p.isActive));
      } catch {
        setError("Failed to load policies.");
      }
    };
    fetchPolicies();
  }, [userId]);

  // Load hospitals based on selected policy's plan
  useEffect(() => {
    const fetchHospitals = async () => {
      if (!policyId) {
        setHospitals([]);
        setHospitalId("");
        return;
      }
      
      const selectedPolicy = policies.find(p => p.policyId.toString() === policyId);
      if (!selectedPolicy) return;

      try {
        const hospRes = await PlanSearchHttpService.getHospitalsByPlan(selectedPolicy.planId);
        setHospitals(hospRes.records ?? []);
        // Reset selected hospital in case it's no longer in the list
        setHospitalId("");
      } catch {
        setError("Failed to load hospitals for this plan.");
      }
    };
    fetchHospitals();
  }, [policyId, policies]);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!policyId || !hospitalId || !claimAmount || !disease || !doctorName) {
      setError("Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await ClaimHttpService.submit(
        Number(policyId),
        Number(hospitalId),
        Number(claimAmount),
        disease,
        doctorName,
        description || undefined,
      );
      setSuccess(res.message);
      // Reset form
      setPolicyId("");
      setHospitalId("");
      setClaimAmount("");
      setDisease("");
      setDoctorName("");
      setDescription("");
    } catch (err: any) {
      const errMsg = err.response?.data?.errorMessage || (typeof err.response?.data === 'string' ? err.response.data : "Claim submission failed.");
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        Submit Claim
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Raise a new insurance claim for your policy.
      </p>

      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg">
        {/* Policy Selection */}
        <div className="mb-4">
          <label className="block text-sm text-slate-600 mb-1">
            Select Policy *
          </label>
          <select
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Active Policy --</option>
            {policies.map((p) => (
              <option key={p.policyId} value={p.policyId}>
                Policy #{p.policyId} — Plan {p.planId} — Valid till {p.endDate}
              </option>
            ))}
          </select>
        </div>

        {/* Hospital Selection */}
        <div className="mb-4">
          <label className="block text-sm text-slate-600 mb-1">
            Select Hospital *
          </label>
          <select
            value={hospitalId}
            onChange={(e) => setHospitalId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Hospital --</option>
            {hospitals.map((h) => (
              <option key={h.hospitalId} value={h.hospitalId}>
                {h.hospitalName} — {h.city}
              </option>
            ))}
          </select>
        </div>

        {/* Claim Amount */}
        <div className="mb-4">
          <label className="block text-sm text-slate-600 mb-1">
            Claim Amount (₹) *
          </label>
          <input
            type="number"
            value={claimAmount}
            onChange={(e) => setClaimAmount(e.target.value)}
            placeholder="e.g. 15000"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Disease */}
        <div className="mb-4">
          <label className="block text-sm text-slate-600 mb-1">Disease *</label>
          <input
            type="text"
            value={disease}
            onChange={(e) => setDisease(e.target.value)}
            placeholder="e.g. Viral Fever"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Doctor Name */}
        <div className="mb-4">
          <label className="block text-sm text-slate-600 mb-1">
            Doctor Name *
          </label>
          <input
            type="text"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="e.g. Dr. Sharma"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm text-slate-600 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of treatment..."
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Error / Success */}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-4">{success}</p>}

        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-5 py-2 rounded-lg transition-colors"
        >
          <ClipboardList size={16} />
          {loading ? "Submitting..." : "Submit Claim"}
        </button>
      </div>
    </div>
  );
};

export default SubmitClaim;

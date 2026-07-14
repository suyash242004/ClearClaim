// FamilyMembers.tsx
// Customer can view, add and delete family members under their policies
// All DB trigger rules are replicated here to give clear feedback BEFORE the API call:
//   Trigger 4 — Max members per plan
//   Trigger 5 — Relation allowed per plan (Personal→none, Family→no parents, Parent→only parents)
//   Trigger 6 — Age validation (parents older, children younger than customer)
//   Trigger 7 — No duplicate relations per policy

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import PolicyHttpService from "../../services/PolicyHttpService";
import InsuranceplanHttpService from "../../services/InsuranceplanHttpService";
import FamilymemberHttpService from "../../services/FamilymemberHttpService";
import CustomerHttpService from "../../services/CustomerHttpService";
import type { Policy } from "../../models/Policy";
import type { Insuranceplan } from "../../models/Insuranceplan";
import type { Familymember } from "../../models/Familymember";
import type { Customer } from "../../models/Customer";
import { Users, Trash2, UserPlus, Info, Shield, CheckCircle, Heart, FileText, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SpotlightCard from "../../components/SpotlightCard";

const GENDERS = ["Male", "Female", "Other"];

// Trigger 5 — replicate relation rules from validate_family_relation()
const getAllowedRelations = (planId: number): string[] => {
  if (planId === 1) return []; // Personal — no family
  if (planId === 2) return ["Wife", "Husband", "Son", "Daughter"]; // Family — no parents
  if (planId === 3) return ["Father", "Mother"]; // Parent plan — only parents
  return ["Wife", "Husband", "Son", "Daughter", "Father", "Mother"]; // Complete — all
};

// Human-readable plan rule for the info banner
const getPlanRule = (planId: number): string => {
  if (planId === 1)
    return "Personal Medical Insurance does not allow any family members.";
  if (planId === 2)
    return "Family Medical Insurance allows: Wife, Husband, Son, Daughter. Parents (Father/Mother) are not covered.";
  if (planId === 3)
    return "Parent Medical Insurance allows only: Father and Mother.";
  return "Complete Family Medical Insurance allows all relations.";
};

const FamilyMembers = () => {
  const { userId } = useSelector((state: RootState) => state.auth);

  // --- Customer profile (gender used to exclude spousal relation) ---
  const [customer, setCustomer] = useState<Customer | null>(null);

  // --- Policies & Plan ---
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<Insuranceplan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // --- Members ---
  const [allMembers, setAllMembers] = useState<Familymember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Familymember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // --- Add member form ---
  const [showForm, setShowForm] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [relation, setRelation] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

  // --- Feedback ---
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load customer profile + policies on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch customer profile — need gender to exclude spousal relation
        const custRes = await CustomerHttpService.getById(userId!);
        setCustomer(custRes.record ?? null);
      } catch {
        // Non-fatal — gender filter just won't apply
      }
      try {
        const res = await PolicyHttpService.getByCustomer(userId!);
        setPolicies(res.records ?? []);
      } catch {
        // ReadAPI returns HTTP 500 when the customer has no policies yet —
        // show the friendly "No active policies" empty state, not an error
        setPolicies([]);
      }
    };
    fetchInitialData();
  }, [userId]);

  // When policy changes — fetch plan details + members
  useEffect(() => {
    if (!selectedPolicyId) {
      setFilteredMembers([]);
      setAllMembers([]);
      setSelectedPlan(null);
      return;
    }

    const policy = policies.find((p) => p.policyId === Number(selectedPolicyId));
    if (!policy) return;

    const fetchPlanAndMembers = async () => {
      setLoadingPlan(true);
      setLoadingMembers(true);
      setError("");
      setSuccess("");
      setShowForm(false);

      try {
        // Fetch plan details for maxMembers + relation rules
        const planRes = await InsuranceplanHttpService.getById(policy.planId);
        setSelectedPlan(planRes.record ?? null);
      } catch {
        setError("Failed to load plan details.");
      } finally {
        setLoadingPlan(false);
      }

      try {
        // Fetch all members and filter by policyId
        const memRes = await FamilymemberHttpService.getAll();
        const members = memRes.records ?? [];
        setAllMembers(members);
        setFilteredMembers(
          members.filter((m) => m.policyId === Number(selectedPolicyId)),
        );
      } catch {
        setError("Failed to load family members.");
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchPlanAndMembers();
  }, [selectedPolicyId, policies]);

  // Keep filteredMembers in sync when allMembers changes
  useEffect(() => {
    if (!selectedPolicyId) return;
    setFilteredMembers(
      allMembers.filter((m) => m.policyId === Number(selectedPolicyId)),
    );
  }, [allMembers, selectedPolicyId]);

  // Derived values from plan + current members
  const allowedRelations = selectedPlan ? getAllowedRelations(selectedPlan.planId) : [];
  const maxMembers = selectedPlan?.maxMembers ?? 0;
  const slotsRemaining = maxMembers - filteredMembers.length;
  const usedRelations = filteredMembers.map((m) => m.relation);

  // Option 3 — exclude the spousal relation that matches the customer's own gender
  // Male customer → cannot add "Husband" (he IS the husband/main insured)
  // Female customer → cannot add "Wife" (she IS the wife/main insured)
  const selfSpousalRelation =
    customer?.gender === "Male" ? "Husband"
    : customer?.gender === "Female" ? "Wife"
    : null; // Other/unknown → no exclusion

  // Relations available for next add:
  // filter out: not allowed by plan + already used (Trigger 7) + customer's own spousal role
  const availableRelations = allowedRelations.filter(
    (r) => !usedRelations.includes(r) && r !== selfSpousalRelation,
  );

  // Can add more members?
  const canAdd = slotsRemaining > 0 && availableRelations.length > 0;

  // Add new family member
  const handleAdd = async () => {
    setError("");
    setSuccess("");

    if (!memberName.trim()) { setError("Member name is required."); return; }
    if (!relation) { setError("Please select a relation."); return; }
    
    // UI Validation for Age (Trigger 6 replicate)
    if (age && customer?.age) {
      const numAge = Number(age);
      if ((relation === "Father" || relation === "Mother") && numAge <= customer.age) {
        setError("Error: Parent must be strictly older than you.");
        return;
      }
      if ((relation === "Son" || relation === "Daughter") && numAge >= customer.age) {
        setError("Error: Child must be strictly younger than you.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const newMember: Familymember = {
        memberId: 0,
        policyId: Number(selectedPolicyId),
        memberName: memberName.trim(),
        relation,
        age: age ? Number(age) : undefined,
        gender: gender || undefined,
      };

      const res = await FamilymemberHttpService.create(newMember);
      setSuccess(res.message ?? "Family member added successfully.");

      if (res.record) {
        setAllMembers((prev) => [...prev, res.record!]);
      }

      // Reset form
      setMemberName("");
      setRelation("");
      setAge("");
      setGender("");
      setShowForm(false);
    } catch (err: any) {
      // Show DB trigger error message directly (they're clear and descriptive)
      const errMsg = err.response?.data?.errorMessage || (typeof err.response?.data === 'string' ? err.response.data : "Failed to add family member.");
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete a family member
  const handleDelete = async (memberId: number) => {
    setError("");
    setSuccess("");
    try {
      const res = await FamilymemberHttpService.delete(memberId);
      setSuccess(res.message ?? "Family member removed.");
      setAllMembers((prev) => prev.filter((m) => m.memberId !== memberId));
      setDeletingId(null);
    } catch (err: any) {
      const errMsg = err.response?.data?.errorMessage || (typeof err.response?.data === 'string' ? err.response.data : "Failed to remove member.");
      setError(errMsg);
      setDeletingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div>
        <p className="text-xs font-medium tracking-[0.2em] uppercase mb-2" style={{ color: "#6366F1" }}>
          Dependents
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Users size={24} className="text-indigo-400" /> Family Members
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage family members covered under your insurance policies.
        </p>
      </div>

      {/* Policy Selector Chips */}
      <div>
        <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3">
          Select Policy
        </label>
        
        {policies.length === 0 ? (
          <div className="bg-[#080810] rounded-xl p-4 text-center border border-white/5">
            <p className="text-sm text-slate-500">No active policies found.</p>
            <p className="text-xs text-slate-600 mt-1">Purchase a plan from Browse Plans to add family members.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {policies.map((p: any) => {
              const isSelected = selectedPolicyId === String(p.policyId);
              return (
                <button
                  key={p.policyId}
                  onClick={() => {
                    setSelectedPolicyId(String(p.policyId));
                    setError("");
                    setSuccess("");
                    setRelation("");
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                      : "bg-[#080810] border border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Shield size={16} className={isSelected ? "text-indigo-200" : "text-slate-500"} />
                  {p.planName || `Policy #${p.policyId}`}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                    isSelected ? "bg-indigo-900/50 text-indigo-200" : "bg-white/5 text-slate-500"
                  }`}>
                    #{p.policyId}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Plan Rules Banner — shown after policy is selected */}
      {selectedPlan && !loadingPlan && (
        <div className="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-5">
          <Info size={18} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-400">
              {selectedPlan.planName}
            </p>
            <p className="text-sm text-indigo-300/80 mt-0.5">
              {getPlanRule(selectedPlan.planId)}
            </p>
            {allowedRelations.length > 0 && (
              <p className="text-xs text-indigo-400/80 mt-1">
                Slots: {filteredMembers.length} / {maxMembers} used —{" "}
                <span className="font-semibold">{slotsRemaining} remaining</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {/* Members section */}
      {selectedPolicyId && !loadingPlan && selectedPlan && (
        <>
          {/* Personal plan — block message */}
          {allowedRelations.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
              <Users className="mx-auto text-amber-400 mb-2" size={32} />
              <p className="text-amber-400 text-sm font-medium">
                This plan does not cover family members.
              </p>
              <p className="text-amber-400/80 text-xs mt-1">
                Upgrade to Family or Parent plan to add family coverage.
              </p>
            </div>
          ) : (
            <>
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-indigo-400" />
                  <h3 className="text-white font-semibold text-sm">
                    Members under Policy #{selectedPolicyId}
                  </h3>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {filteredMembers.length}/{maxMembers}
                  </span>
                </div>

                {canAdd && (
                  <button
                    onClick={() => {
                      setShowForm(!showForm);
                      setError("");
                      setSuccess("");
                    }}
                    className="btn-ghast flex items-center gap-2 text-xs py-1.5 px-3"
                  >
                    <UserPlus size={14} />
                    Add Member
                  </button>
                )}

                {!canAdd && (
                  <span className="text-xs text-slate-500 italic">
                    {slotsRemaining === 0
                      ? "Maximum members reached"
                      : "All allowed relations already added"}
                  </span>
                )}
              </div>

              {/* Add Member Form */}
              {showForm && canAdd && (
                <div className="card p-5 mb-5 border-indigo-500/20">
                  <h4 className="text-white font-medium text-sm mb-4">
                    New Family Member
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">

                    {/* Member Name */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">
                        Member Name *
                      </label>
                      <input
                        type="text"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        placeholder="e.g. Priya Sharma"
                        className="input-indigo"
                      />
                    </div>

                    {/* Relation — only available (allowed + not yet used) */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">
                        Relation *
                      </label>
                      <select
                        value={relation}
                        onChange={(e) => setRelation(e.target.value)}
                        className="input-indigo"
                      >
                        <option value="">-- Select Relation --</option>
                        {availableRelations.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        Only relations not yet added are shown
                      </p>
                    </div>

                    {/* Age */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">
                        Age{" "}
                        <span className="text-slate-500">(optional)</span>
                      </label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 35"
                        min={1}
                        max={149}
                        className="input-indigo"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">
                        Gender{" "}
                        <span className="text-slate-500">(optional)</span>
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="input-indigo"
                      >
                        <option value="">-- Select Gender --</option>
                        {GENDERS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleAdd}
                      disabled={submitting}
                      className="btn-primary flex items-center gap-2 text-xs py-2 px-4"
                    >
                      <UserPlus size={14} />
                      {submitting ? "Adding..." : "Add Member"}
                    </button>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setMemberName("");
                        setRelation("");
                        setAge("");
                        setGender("");
                        setError("");
                      }}
                      className="btn-ghost text-xs py-2 px-4"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Members Table */}
              {loadingMembers ? (
                <div className="flex items-center justify-center h-48 card">
                  <span className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="card p-8 text-center border-indigo-500/10">
                  <Users className="mx-auto text-slate-500 mb-2" size={36} />
                  <p className="text-slate-400 text-sm">
                    No family members added under this policy yet.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMembers.map((member) => (
                    <SpotlightCard key={member.memberId} className="flex flex-col border border-white/5 bg-[#080810] p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Heart size={18} className="text-indigo-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-bold">{member.memberName}</h4>
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block mt-1">
                              {member.relation}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-5 mt-auto">
                        <div className="bg-white/5 rounded-lg p-2.5">
                          <p className="text-xs text-slate-500 mb-1">Age</p>
                          <p className="text-sm font-semibold text-slate-300">{member.age ?? "Not provided"}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2.5">
                          <p className="text-xs text-slate-500 mb-1">Gender</p>
                          <p className="text-sm font-semibold text-slate-300">{member.gender ?? "Not provided"}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex justify-end mt-auto">
                        {deletingId === member.memberId ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(member.memberId)}
                              className="text-xs font-semibold bg-red-500 text-white hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors shadow-lg shadow-red-500/20"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(member.memberId)}
                            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        )}
                      </div>
                    </SpotlightCard>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </motion.div>
  );
};

export default FamilyMembers;

// Claim.ts
// Represents the Claim entity from the backend
// Maps to the claims table in PostgreSQL

export interface Claim {
  claimId: number;
  policyId: number;
  hospitalId: number;
  claimDate: string; // DateOnly from backend comes as string in JSON
  claimAmount: number;
  disease?: string;
  status?: string; // Pending / Approved / Rejected
  doctorName?: string;
  description?: string;
  aiDecision?: string;
  txHash?: string;
}

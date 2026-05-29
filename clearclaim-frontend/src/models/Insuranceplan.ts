// Insuranceplan.ts
// Represents the InsurancePlan entity from the backend
// Maps to the insuranceplan table in PostgreSQL

export interface Insuranceplan {
  planId: number;
  planName: string;
  premiumAmount: number;
  coverageAmount: number;
  maxMembers: number;
  policyDuration: number;
}

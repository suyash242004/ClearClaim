// Policy.ts
// Represents the Policy entity from the backend
// Maps to the policys table in PostgreSQL

export interface Policy {
  policyId: number;
  customerId: number;
  planId: number;
  startDate: string; // DateOnly from backend comes as string in JSON
  endDate: string;
  isActive: boolean;
  renewalCount: number;
}

// Familymember.ts
// Represents the FamilyMember entity from the backend
// Maps to the familymember table in PostgreSQL

export interface Familymember {
  memberId: number;
  policyId: number;
  memberName: string;
  relation: string;
  age?: number;
  gender?: string;
}

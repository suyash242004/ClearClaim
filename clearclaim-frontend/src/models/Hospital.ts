// Hospital.ts
// Represents the Hospital entity from the backend
// Maps to the hospital table in PostgreSQL

export interface Hospital {
  hospitalId: number;
  hospitalName: string;
  city: string;
  isCashless: boolean;
}

// Customer.ts
// Represents the Customer entity from the backend
// Maps to the customer table in PostgreSQL

export interface Customer {
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  gender?: string;
  age?: number;
  city?: string;
  profession?: string;
  bloodGroup?: string;
  historicalDisease?: string;
}

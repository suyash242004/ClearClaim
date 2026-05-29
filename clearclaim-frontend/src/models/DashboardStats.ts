// DashboardStats.ts
// Represents the admin dashboard statistics
// Returned by GET /api/admin/dashboard

export interface DashboardStats {
  totalCustomers: number;
  activePolicies: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  totalRevenue: number;
  totalHospitals: number;
  totalPlans: number;
}

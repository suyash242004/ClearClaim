namespace Com.Application.Domain.Entities
{
    public class DashboardStats : BaseEntity
    {
        public int TotalCustomers { get; set; }
        public int ActivePolicies { get; set; }
        public int PendingClaims { get; set; }
        public int ApprovedClaims { get; set; }
        public int RejectedClaims { get; set; }
        public decimal TotalRevenue { get; set; }
        public int TotalHospitals { get; set; }
        public int TotalPlans { get; set; }
    }
}
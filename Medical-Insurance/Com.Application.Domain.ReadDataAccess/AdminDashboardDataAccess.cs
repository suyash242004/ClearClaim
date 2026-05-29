using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Com.Application.Domain.ReadDataAccess
{
    public class AdminDashboardDataAccess : IAdminDashboardDataAccess
    {
        private readonly string _connectionString;
        private readonly NpgsqlConnection conn;
        // Pass IConfiguration to constructor
        public AdminDashboardDataAccess(IConfiguration configuration)
        {
            // Get string from appsettings.json
            _connectionString = configuration.GetConnectionString("AppConn");

            // Set up connection using the safe string
            conn = new NpgsqlConnection(_connectionString);
        }

        public async Task<ResponseObject<Customer>> SearchCustomersAsync(string? city, string? profession, string? bloodGroup, string? disease)
        {
            ResponseObject<Customer> response = new();
            try
            {
                await conn.OpenAsync();

                var query = @"
                    SELECT customer_id, customer_name, customer_email,
                           customer_phone, gender, age, city,
                           profession, blood_group, historical_disease
                    FROM customer
                    WHERE 1=1
                ";

                if (!string.IsNullOrEmpty(city))
                    query += " AND LOWER(city) = LOWER(@City)";

                if (!string.IsNullOrEmpty(profession))
                    query += " AND LOWER(profession) = LOWER(@Profession)";

                if (!string.IsNullOrEmpty(bloodGroup))
                    query += " AND blood_group = @BloodGroup";

                if (!string.IsNullOrEmpty(disease))
                    query += " AND LOWER(historical_disease) LIKE LOWER(@Disease)";

                var data = await conn.QueryAsync(query, new
                {
                    City = city,
                    Profession = profession,
                    BloodGroup = bloodGroup,
                    Disease = $"%{disease}%"
                });

                response.Records = data.Select(x => new Customer
                {
                    CustomerId = x.customer_id,
                    CustomerName = x.customer_name,
                    CustomerEmail = x.customer_email,
                    CustomerPhone = x.customer_phone,
                    Gender = x.gender,
                    Age = x.age,
                    City = x.city,
                    Profession = x.profession,
                    BloodGroup = x.blood_group,
                    HistoricalDisease = x.historical_disease
                });

                response.Message = "Customers fetched successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();
            }
            catch (Exception ex)
            {
                throw new Exception(
                    ex.InnerException?.InnerException?.Message ??
                    ex.InnerException?.Message ??
                    ex.Message
                );
            }
            return response;
        }

        public async Task<ResponseObject<DashboardStats>> GetDashboardStatsAsync()
        {
            ResponseObject<DashboardStats> response = new();
            try
            {
                await conn.OpenAsync();

                var data = await conn.QueryFirstOrDefaultAsync(@"
                    SELECT
                        (SELECT COUNT(*) FROM customer)                                    AS total_customers,
                        (SELECT COUNT(*) FROM policys WHERE is_active = true)              AS active_policies,
                        (SELECT COUNT(*) FROM claims WHERE status = 'Pending')             AS pending_claims,
                        (SELECT COUNT(*) FROM claims WHERE status = 'Approved')            AS approved_claims,
                        (SELECT COUNT(*) FROM claims WHERE status = 'Rejected')            AS rejected_claims,
                        (SELECT COALESCE(SUM(ip.premium_amount), 0)
                         FROM policys p
                         JOIN insuranceplan ip ON p.plan_id = ip.plan_id
                         WHERE p.is_active = true)                                         AS total_revenue,
                        (SELECT COUNT(*) FROM hospital)                                    AS total_hospitals,
                        (SELECT COUNT(*) FROM insuranceplan)                               AS total_plans
                ");

                response.Record = new DashboardStats
                {
                    TotalCustomers = (int)data.total_customers,
                    ActivePolicies = (int)data.active_policies,
                    PendingClaims = (int)data.pending_claims,
                    ApprovedClaims = (int)data.approved_claims,
                    RejectedClaims = (int)data.rejected_claims,
                    TotalRevenue = (decimal)data.total_revenue,
                    TotalHospitals = (int)data.total_hospitals,
                    TotalPlans = (int)data.total_plans
                };

                response.Message = "Dashboard stats fetched successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();
            }
            catch (Exception ex)
            {
                throw new Exception(
                    ex.InnerException?.InnerException?.Message ??
                    ex.InnerException?.Message ??
                    ex.Message
                );
            }
            return response;
        }
    }
}
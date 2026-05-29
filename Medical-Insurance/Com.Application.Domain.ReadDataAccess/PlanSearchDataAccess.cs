using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Com.Application.Domain.ReadDataAccess
{
    public class PlanSearchDataAccess : IPlanDataAccess
    {
        private readonly string _connectionString;
        private readonly NpgsqlConnection conn;
        // Pass IConfiguration to constructor
        public PlanSearchDataAccess(IConfiguration configuration)
        {
            // Get string from appsettings.json
            _connectionString = configuration.GetConnectionString("AppConn");

            // Set up connection using the safe string
            conn = new NpgsqlConnection(_connectionString);
        }

        public async Task<ResponseObject<Insuranceplan>> SearchPlansAsync(string? city, decimal? maxPremium, int? minCoverage)
        {
            ResponseObject<Insuranceplan> response = new();
            try
            {
                await conn.OpenAsync();

                // Dynamic query — only filter by what is provided
                var query = @"
                    SELECT DISTINCT ip.plan_id, ip.plan_name, ip.premium_amount, 
                                    ip.coverage_amount, ip.max_members, ip.policy_duration
                    FROM insuranceplan ip
                    LEFT JOIN planhospital ph ON ip.plan_id = ph.plan_id
                    LEFT JOIN hospital h ON ph.hospital_id = h.hospital_id
                    WHERE 1=1
                ";

                // Build filters dynamically
                if (!string.IsNullOrEmpty(city))
                    query += " AND LOWER(h.city) = LOWER(@City)";

                if (maxPremium.HasValue)
                    query += " AND ip.premium_amount <= @MaxPremium";

                if (minCoverage.HasValue)
                    query += " AND ip.coverage_amount >= @MinCoverage";

                var data = await conn.QueryAsync(query, new
                {
                    City = city,
                    MaxPremium = maxPremium,
                    MinCoverage = minCoverage
                });

                response.Records = data.Select(x => new Insuranceplan
                {
                    PlanId = x.plan_id,
                    PlanName = x.plan_name,
                    PremiumAmount = x.premium_amount,
                    CoverageAmount = x.coverage_amount,
                    MaxMembers = x.max_members,
                    PolicyDuration = x.policy_duration
                });

                response.Message = "Plans fetched successfully.";
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

        public async Task<ResponseObject<Insuranceplan>> ComparePlansAsync(List<int> planIds)
        {
            ResponseObject<Insuranceplan> response = new();
            try
            {
                await conn.OpenAsync();

                var data = await conn.QueryAsync(@"
                    SELECT plan_id, plan_name, premium_amount, 
                           coverage_amount, max_members, policy_duration
                    FROM insuranceplan
                    WHERE plan_id = ANY(@PlanIds)
                ", new { PlanIds = planIds.ToArray() });

                response.Records = data.Select(x => new Insuranceplan
                {
                    PlanId = x.plan_id,
                    PlanName = x.plan_name,
                    PremiumAmount = x.premium_amount,
                    CoverageAmount = x.coverage_amount,
                    MaxMembers = x.max_members,
                    PolicyDuration = x.policy_duration
                });

                response.Message = "Plans compared successfully.";
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

        public async Task<ResponseObject<Hospital>> GetHospitalsByPlanAsync(int planId)
        {
            ResponseObject<Hospital> response = new();
            try
            {
                await conn.OpenAsync();

                var data = await conn.QueryAsync(@"
                    SELECT h.hospital_id, h.hospital_name, h.city, h.is_cashless
                    FROM hospital h
                    JOIN planhospital ph ON h.hospital_id = ph.hospital_id
                    WHERE ph.plan_id = @PlanId
                ", new { PlanId = planId });


                response.Records = data.Select(x => new Hospital
                {
                    HospitalId = x.hospital_id,
                    HospitalName = x.hospital_name,
                    City = x.city,
                    IsCashless = x.is_cashless
                });

                //if (!response.Records.Any())
                //    return Notfound($"No hospitals found for Plan ID {planId}.");

                response.Message = "Hospitals fetched successfully.";
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
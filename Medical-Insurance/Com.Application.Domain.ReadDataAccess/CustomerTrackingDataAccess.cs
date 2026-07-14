using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Com.Application.Domain.ReadDataAccess
{
    public class CustomerTrackingDataAccess : ICustomerTrackingDataAccess
    {
        private readonly string _connectionString;
        private readonly NpgsqlConnection conn;
        // Pass IConfiguration to constructor
        public CustomerTrackingDataAccess(IConfiguration configuration)
        {
            // Get string from appsettings.json
            _connectionString = configuration.GetConnectionString("AppConn");

            // Set up connection using the safe string
            conn = new NpgsqlConnection(_connectionString);
        }

        public async Task<ResponseObject<Policy>> GetCustomerPoliciesAsync(int customerId)
        {
            ResponseObject<Policy> response = new();
            try
            {
                await conn.OpenAsync();

                var data = await conn.QueryAsync(@"
                    SELECT 
                        p.policy_id, p.customer_id, p.plan_id,
                        p.start_date, p.end_date, p.is_active, p.renewal_count,
                        ip.plan_name, ip.premium_amount, ip.coverage_amount,
                        ip.max_members, ip.policy_duration
                    FROM policys p
                    JOIN insuranceplan ip ON p.plan_id = ip.plan_id
                    WHERE p.customer_id = @CustomerId
                    ORDER BY p.start_date DESC
                ", new { CustomerId = customerId });

                response.Records = data.Select(x => new Policy
                {
                    PolicyId = x.policy_id,
                    CustomerId = x.customer_id,
                    PlanId = x.plan_id,
                    StartDate = DateOnly.FromDateTime(x.start_date),
                    EndDate = DateOnly.FromDateTime(x.end_date),
                    IsActive = x.is_active,
                    RenewalCount = x.renewal_count,
                    PlanName = x.plan_name,
                    CoverageAmount = x.coverage_amount
                }).ToList();

                response.Message = "Customer policies fetched successfully.";
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

        public async Task<ResponseObject<Claim>> GetCustomerClaimsAsync(int customerId)
        {
            ResponseObject<Claim> response = new();
            try
            {
                await conn.OpenAsync();

                var data = await conn.QueryAsync(@"
                    SELECT 
                        c.claim_id, c.policy_id, c.hospital_id,
                        c.claim_date, c.claim_amount, c.disease,
                        c.status, c.doctor_name, c.description,
                        c.ai_decision, c.ai_reasoning, c.ai_confidence,
                        c.fraud_score, c.tx_hash,
                        h.hospital_name, h.city
                    FROM claims c
                    JOIN policys p ON c.policy_id = p.policy_id
                    JOIN hospital h ON c.hospital_id = h.hospital_id
                    WHERE p.customer_id = @CustomerId
                    ORDER BY c.claim_date DESC
                ", new { CustomerId = customerId });

                response.Records = data.Select(x => new Claim
                {
                    ClaimId = x.claim_id,
                    PolicyId = x.policy_id,
                    HospitalId = x.hospital_id,
                    ClaimDate = DateOnly.FromDateTime(x.claim_date),
                    ClaimAmount = x.claim_amount,
                    Disease = x.disease,
                    Status = x.status,
                    DoctorName = x.doctor_name,
                    Description = x.description,
                    AiDecision = x.ai_decision,
                    AiReasoning = x.ai_reasoning,
                    AiConfidence = x.ai_confidence,
                    FraudScore = x.fraud_score,
                    TxHash = x.tx_hash
                }).ToList();

                response.Message = "Customer claims fetched successfully.";
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
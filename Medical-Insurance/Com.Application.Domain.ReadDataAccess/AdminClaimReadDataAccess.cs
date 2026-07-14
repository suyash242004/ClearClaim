using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Com.Application.Domain.ReadDataAccess
{
    public class AdminClaimReadDataAccess : IAdminClaimDataAccess
    {
        private readonly string _connectionString;
        private readonly NpgsqlConnection conn;
        // Pass IConfiguration to constructor
        public AdminClaimReadDataAccess(IConfiguration configuration)
        {
            // Get string from appsettings.json
            _connectionString = configuration.GetConnectionString("AppConn");

            // Set up connection using the safe string
            conn = new NpgsqlConnection(_connectionString);
        }

        public async Task<ResponseObject<Claim>> GetPendingClaimsAsync()
        {
            ResponseObject<Claim> response = new();
            try
            {
                await conn.OpenAsync();

                var data = await conn.QueryAsync(@"
                    SELECT
                        claim_id, policy_id, hospital_id,
                        claim_date, claim_amount, disease,
                        status, doctor_name, description,
                        ai_decision, ai_reasoning, ai_confidence,
                        fraud_score, tx_hash
                    FROM claims
                    WHERE status = 'Pending'
                    ORDER BY claim_date ASC
                ");

                response.Records = data.Select(x => new Claim
                {
                    ClaimId     = x.claim_id,
                    PolicyId    = x.policy_id,
                    HospitalId  = x.hospital_id,
                    ClaimDate   = DateOnly.FromDateTime(x.claim_date),
                    ClaimAmount = x.claim_amount,
                    Disease     = x.disease,
                    Status      = x.status,
                    DoctorName  = x.doctor_name,
                    Description = x.description,
                    AiDecision  = x.ai_decision,
                    AiReasoning = x.ai_reasoning,
                    AiConfidence = x.ai_confidence,
                    FraudScore  = x.fraud_score,
                    TxHash      = x.tx_hash,
                }).ToList();

                response.Message = "Pending claims fetched successfully.";
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

        public async Task<ResponseObject<Claim>> GetClaimsWithAiDataAsync()
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
                        c.fraud_score, c.tx_hash
                    FROM claims c
                    ORDER BY c.claim_date DESC
                    LIMIT 100
                ");

                response.Records = data.Select(x => new Claim
                {
                    ClaimId      = x.claim_id,
                    PolicyId     = x.policy_id,
                    HospitalId   = x.hospital_id,
                    ClaimDate    = DateOnly.FromDateTime(x.claim_date),
                    ClaimAmount  = x.claim_amount,
                    Disease      = x.disease,
                    Status       = x.status,
                    DoctorName   = x.doctor_name,
                    Description  = x.description,
                    AiDecision   = x.ai_decision,
                    AiReasoning  = x.ai_reasoning,
                    AiConfidence = x.ai_confidence,
                    FraudScore   = x.fraud_score,
                    TxHash       = x.tx_hash,
                }).ToList();

                response.Message = "Claims with AI data fetched successfully.";
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

        public Task<ResponseObject<Claim>> ApproveClaimAsync(int claimId)
        {
            throw new NotImplementedException();
        }

        public Task<ResponseObject<Claim>> RejectClaimAsync(int claimId)
        {
            throw new NotImplementedException();
        }
    }
}
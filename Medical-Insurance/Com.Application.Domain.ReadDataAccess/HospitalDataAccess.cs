using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Com.Application.Domain.ReadDataAccess
{
    public class HospitalDataAccess : IHospitalDataAccess
    {
        private readonly string _connectionString;
        private readonly NpgsqlConnection conn;
        // Pass IConfiguration to constructor
        public HospitalDataAccess(IConfiguration configuration)
        {
            // Get string from appsettings.json
            _connectionString = configuration.GetConnectionString("AppConn");

            // Set up connection using the safe string
            conn = new NpgsqlConnection(_connectionString);
        }

        public async Task<ResponseObject<Claim>> GetHospitalClaimsAsync(int hospitalId)
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
                        cu.customer_name, cu.customer_phone
                    FROM claims c
                    JOIN policys p ON c.policy_id = p.policy_id
                    JOIN customer cu ON p.customer_id = cu.customer_id
                    WHERE c.hospital_id = @HospitalId
                    ORDER BY c.claim_date DESC
                ", new { HospitalId = hospitalId });

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
                    Description = x.description
                });

                response.Message = "Hospital claims fetched successfully.";
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

        public async Task<ResponseObject<Claim>> GetHospitalClaimsByStatusAsync(int hospitalId, string status)
        {
            ResponseObject<Claim> response = new();
            try
            {
                await conn.OpenAsync();

                var data = await conn.QueryAsync(@"
                    SELECT 
                        c.claim_id, c.policy_id, c.hospital_id,
                        c.claim_date, c.claim_amount, c.disease,
                        c.status, c.doctor_name, c.description
                    FROM claims c
                    WHERE c.hospital_id = @HospitalId
                    AND LOWER(c.status) = LOWER(@Status)
                    ORDER BY c.claim_date DESC
                ", new { HospitalId = hospitalId, Status = status });

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
                    Description = x.description
                });

                response.Message = $"Hospital claims with status {status} fetched successfully.";
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
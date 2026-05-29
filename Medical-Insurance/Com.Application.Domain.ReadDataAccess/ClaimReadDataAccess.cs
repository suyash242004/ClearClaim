using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Dapper;
using Dapper.Contrib;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Com.Application.Domain.ReadDataAccess
{
    public class ClaimReadDataAccess : IReadDataAccess<Claim, int>
    {
        private readonly string _connectionString;
        private readonly NpgsqlConnection conn;
        // Pass IConfiguration to constructor
        public ClaimReadDataAccess(IConfiguration configuration)
        {
            // Get string from appsettings.json
            _connectionString = configuration.GetConnectionString("AppConn");

            // Set up connection using the safe string
            conn = new NpgsqlConnection(_connectionString);
        }

        public async Task<ResponseObject<Claim>> ReadAsync()
        {
            ResponseObject<Claim> response = new ResponseObject<Claim>();
            try
            {
                await conn.OpenAsync();
                //response.Records = await conn.QueryAsync<Claim>("SELECT * FROM claims");
                var data = await conn.QueryAsync(
                    @"SELECT 
                        claim_id,
                        policy_id,
                        hospital_id,
                        claim_date,
                        claim_amount,
                        disease,
                        doctor_name,
                        description,
                        status
                      FROM claims");

                response.Records = data.Select(x => new Claim
                {
                    ClaimId = x.claim_id,
                    PolicyId = x.policy_id,
                    HospitalId = x.hospital_id,
                    ClaimDate = DateOnly.FromDateTime(x.claim_date),
                    ClaimAmount = x.claim_amount,
                    Disease = x.disease,
                    DoctorName = x.doctor_name,
                    Description = x.description,
                    Status = x.status
                });

                response.Message = "Records read successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Claim>> ReadAsync(int id)
        {
            ResponseObject<Claim> response = new ResponseObject<Claim>();
            try
            {
                await conn.OpenAsync();
                //response.Record = await conn.QueryFirstOrDefaultAsync<Claim>(
                //    "SELECT * FROM claims WHERE claim_id = @ClaimId", new { ClaimId = id });

                var data = await conn.QueryFirstOrDefaultAsync(
                    @"SELECT 
                        claim_id,
                        policy_id,
                        hospital_id,
                        claim_date,
                        claim_amount,
                        disease,
                        status,
                        doctor_name,
                        description
                      FROM claims
                      WHERE claim_id = @ClaimId",
                    new { ClaimId = id });

                if (data != null)
                {
                    response.Record = new Claim
                    {
                        ClaimId = data.claim_id,
                        PolicyId = data.policy_id,
                        HospitalId = data.hospital_id,
                        ClaimDate = DateOnly.FromDateTime(data.claim_date),
                        ClaimAmount = data.claim_amount,
                        Disease = data.disease,
                        Status = data.status,
                        DoctorName = data.doctor_name,
                        Description = data.description
                    };
                }                


                response.Message = "Record read successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
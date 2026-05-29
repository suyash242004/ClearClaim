using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Dapper;
using Dapper.Contrib;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Com.Application.Domain.ReadDataAccess
{
    public class InsuranceplanReadDataAccess : IReadDataAccess<Insuranceplan, int>
    {
        private readonly string _connectionString;
        private readonly NpgsqlConnection conn;
        // Pass IConfiguration to constructor
        public InsuranceplanReadDataAccess(IConfiguration configuration)
        {
            // Get string from appsettings.json
            _connectionString = configuration.GetConnectionString("AppConn");

            // Set up connection using the safe string
            conn = new NpgsqlConnection(_connectionString);
        }

        public async Task<ResponseObject<Insuranceplan>> ReadAsync()
        {
            ResponseObject<Insuranceplan> response = new ResponseObject<Insuranceplan>();
            try
            {
                await conn.OpenAsync();
                response.Records = await conn.QueryAsync<Insuranceplan>("SELECT * FROM insuranceplan");
                response.Message = "Records read successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Insuranceplan>> ReadAsync(int id)
        {
            ResponseObject<Insuranceplan> response = new ResponseObject<Insuranceplan>();
            try
            {
                await conn.OpenAsync();
                response.Record = await conn.QueryFirstOrDefaultAsync<Insuranceplan>(
                    "SELECT * FROM insuranceplan WHERE plan_id = @PlanId", new { PlanId = id });
                response.Message = "Record read successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
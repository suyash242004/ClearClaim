using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Dapper;
using Dapper.Contrib;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Com.Application.Domain.ReadDataAccess
{
    public class HospitalReadDataAccess : IReadDataAccess<Hospital, int>
    {
        private readonly string _connectionString;
        private readonly NpgsqlConnection conn;
        // Pass IConfiguration to constructor
        public HospitalReadDataAccess(IConfiguration configuration)
        {
            // Get string from appsettings.json
            _connectionString = configuration.GetConnectionString("AppConn");

            // Set up connection using the safe string
            conn = new NpgsqlConnection(_connectionString);
        }

        public async Task<ResponseObject<Hospital>> ReadAsync()
        {
            ResponseObject<Hospital> response = new ResponseObject<Hospital>();
            try
            {
                await conn.OpenAsync();
                var data = await conn.QueryAsync<Hospital>("SELECT * FROM hospital");
                response.Records = data.ToList();
                response.Message = "Records read successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Hospital>> ReadAsync(int id)
        {
            ResponseObject<Hospital> response = new ResponseObject<Hospital>();
            try
            {
                await conn.OpenAsync();
                response.Record = await conn.QueryFirstOrDefaultAsync<Hospital>(
                    "SELECT * FROM hospital WHERE hospital_id = @HospitalId", new { HospitalId = id });
                response.Message = "Record read successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
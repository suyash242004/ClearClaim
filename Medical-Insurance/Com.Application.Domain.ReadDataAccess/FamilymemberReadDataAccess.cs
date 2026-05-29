using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Dapper;
using Dapper.Contrib;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Com.Application.Domain.ReadDataAccess
{
    public class FamilymemberReadDataAccess : IReadDataAccess<Familymember, int>
    {
        private readonly string _connectionString;
        private readonly NpgsqlConnection conn;
        // Pass IConfiguration to constructor
        public FamilymemberReadDataAccess(IConfiguration configuration)
        {
            // Get string from appsettings.json
            _connectionString = configuration.GetConnectionString("AppConn");

            // Set up connection using the safe string
            conn = new NpgsqlConnection(_connectionString);
        }
        public async Task<ResponseObject<Familymember>> ReadAsync()
        {
            ResponseObject<Familymember> response = new ResponseObject<Familymember>();
            try
            {
                await conn.OpenAsync();
                response.Records = await conn.QueryAsync<Familymember>("SELECT * FROM familymember");
                response.Message = "Records read successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();

            }
            catch (Exception ex)
            {

                throw ex;
            }
            return response;
        }

        public async Task<ResponseObject<Familymember>> ReadAsync(int id)
        {
            ResponseObject<Familymember> response = new ResponseObject<Familymember>();
            try
            {
                await conn.OpenAsync();
                response.Record = await conn.QueryFirstOrDefaultAsync<Familymember>(
                    "SELECT * FROM familymember WHERE member_id = @MemberId", new { MemberId = id });
                response.Message = "Record read successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}

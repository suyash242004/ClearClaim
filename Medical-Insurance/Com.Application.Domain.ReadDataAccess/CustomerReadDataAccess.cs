using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Dapper;
using Dapper.Contrib;
using Npgsql;
using Microsoft.Extensions.Configuration;

namespace Com.Application.Domain.ReadDataAccess
{
    public class CustomerReadDataAccess : IReadDataAccess<Customer, int>
    {
        private readonly string _connectionString;
        private readonly NpgsqlConnection conn;
        // Pass IConfiguration to constructor
        public CustomerReadDataAccess(IConfiguration configuration)
        {
            // Get string from appsettings.json
            _connectionString = configuration.GetConnectionString("AppConn");

            // Set up connection using the safe string
            conn = new NpgsqlConnection(_connectionString);
        }
        async public Task<ResponseObject<Customer>> ReadAsync()
        {
            ResponseObject<Customer> response = new ResponseObject<Customer>();
            try
            {
                await conn.OpenAsync();
                response.Records = await conn.QueryAsync<Customer>("SELECT * FROM customer");
                response.Message = "Records are read successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();

            }
            catch (Exception ex)
            {

                throw ex;
            }
            return response;
        }

        async public Task<ResponseObject<Customer>> ReadAsync(int id)
        {
            ResponseObject<Customer> response = new ResponseObject<Customer>();
            try
            {
                await conn.OpenAsync();
                response.Record = await conn.QueryFirstOrDefaultAsync<Customer>(
                    "SELECT * FROM customer WHERE customer_id = @CustomerId", new { CustomerId = id });
                response.Message = "Records are read successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();

            }
            catch (Exception ex)
            {

                throw ex;
            }
            return response;
        }
    }
}

using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Dapper;
using Dapper.Contrib;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Com.Application.Domain.ReadDataAccess
{
    public class PolicyReadDataAccess : IReadDataAccess<Policy, int>
    {
        private readonly string _connectionString;
        private readonly NpgsqlConnection conn;
        // Pass IConfiguration to constructor
        public PolicyReadDataAccess(IConfiguration configuration)
        {
            // Get string from appsettings.json
            _connectionString = configuration.GetConnectionString("AppConn");

            // Set up connection using the safe string
            conn = new NpgsqlConnection(_connectionString);
        }

        public async Task<ResponseObject<Policy>> ReadAsync()
        {
            ResponseObject<Policy> response = new ResponseObject<Policy>();
            try
            {
                await conn.OpenAsync();
                //response.Records = await conn.QueryAsync<Policy>("SELECT * FROM policys");
                var data = await conn.QueryAsync(
                   @"SELECT 
                       policy_id,
                       customer_id,
                       plan_id,
                       start_date,
                       end_date,
                       is_active,
                       renewal_count
                     FROM policys");

                response.Records = data.Select(x => new Policy
                {
                    PolicyId = x.policy_id,
                    CustomerId = x.customer_id,
                    PlanId = x.plan_id,
                    StartDate = DateOnly.FromDateTime(x.start_date),
                    EndDate = DateOnly.FromDateTime(x.end_date),
                    IsActive = x.is_active,
                    RenewalCount = x.renewal_count
                });

                response.Message = "Records read successfully.";
                response.ResponseCode = 200;
                await conn.CloseAsync();
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Policy>> ReadAsync(int id)
        {
            ResponseObject<Policy> response = new ResponseObject<Policy>();
            try
            {
                await conn.OpenAsync();
                //response.Record = await conn.QueryFirstOrDefaultAsync<Policy>(
                //    "SELECT * FROM policys WHERE policy_id = @PolicyId", new { PolicyId = id });
                var data = await conn.QueryFirstOrDefaultAsync(
                      @"SELECT 
                          policy_id,
                          customer_id,
                          plan_id,
                          start_date,
                          end_date,
                          is_active,
                          renewal_count
                        FROM policys
                        WHERE policy_id = @PolicyId",
                    new { PolicyId = id });

                if (data != null)
                {
                    response.Record = new Policy
                    {
                        PolicyId = data.policy_id,
                        CustomerId = data.customer_id,
                        PlanId = data.plan_id,
                        StartDate = DateOnly.FromDateTime(data.start_date),
                        EndDate = DateOnly.FromDateTime(data.end_date),
                        IsActive = data.is_active,
                        RenewalCount = data.renewal_count
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
using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.ReadRepository
{
    public class PolicyReadRepository : IReadContract<Policy, int>
    {
        IReadDataAccess<Policy, int> dataAccess;

        public PolicyReadRepository(IReadDataAccess<Policy, int> dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        async Task<ResponseObject<Policy>> IReadContract<Policy, int>.GetAsync()
        {
            ResponseObject<Policy> response = new();
            try
            {
                response = await dataAccess.ReadAsync();
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Policy>> IReadContract<Policy, int>.GetAsync(int id)
        {
            ResponseObject<Policy> response = new();
            try
            {
                response = await dataAccess.ReadAsync(id);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
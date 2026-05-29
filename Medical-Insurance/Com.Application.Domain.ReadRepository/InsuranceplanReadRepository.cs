using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.ReadRepository
{
    public class InsuranceplanReadRepository : IReadContract<Insuranceplan, int>
    {
        IReadDataAccess<Insuranceplan, int> dataAccess;

        public InsuranceplanReadRepository(IReadDataAccess<Insuranceplan, int> dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        async Task<ResponseObject<Insuranceplan>> IReadContract<Insuranceplan, int>.GetAsync()
        {
            ResponseObject<Insuranceplan> response = new();
            try
            {
                response = await dataAccess.ReadAsync();
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Insuranceplan>> IReadContract<Insuranceplan, int>.GetAsync(int id)
        {
            ResponseObject<Insuranceplan> response = new();
            try
            {
                response = await dataAccess.ReadAsync(id);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
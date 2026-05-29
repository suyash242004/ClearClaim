using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.ReadRepository
{
    public class ClaimReadRepository : IReadContract<Claim, int>
    {
        IReadDataAccess<Claim,int> dataAccess;

        public ClaimReadRepository(IReadDataAccess<Claim,int> dataAccess)
        {
            this.dataAccess = dataAccess;
        }
        async Task<Entities.ResponseObject<Claim>> IReadContract<Claim, int>.GetAsync()
        {
            ResponseObject<Claim> response = new ();
            try
            {
                response = await dataAccess.ReadAsync();
            }
            catch (Exception ex)
            {

                throw ex;
            }
            return response;
        }

        async Task<Entities.ResponseObject<Claim>> IReadContract<Claim, int>.GetAsync(int id)
        {
            ResponseObject<Claim> response = new();
            try
            {
                response = await dataAccess.ReadAsync(id);
            }
            catch (Exception ex)
            {

                throw ex;
            }
            return response;
        }
    }
}

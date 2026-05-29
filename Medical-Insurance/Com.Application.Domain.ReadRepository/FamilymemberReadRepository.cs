using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.ReadRepository
{
    public class FamilymemberReadRepository : IReadContract<Familymember, int>
    {
        IReadDataAccess<Familymember, int> dataAccess;

        public FamilymemberReadRepository(IReadDataAccess<Familymember, int> dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        async Task<ResponseObject<Familymember>> IReadContract<Familymember, int>.GetAsync()
        {
            ResponseObject<Familymember> response = new();
            try
            {
                response = await dataAccess.ReadAsync();
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Familymember>> IReadContract<Familymember, int>.GetAsync(int id)
        {
            ResponseObject<Familymember> response = new();
            try
            {
                response = await dataAccess.ReadAsync(id);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
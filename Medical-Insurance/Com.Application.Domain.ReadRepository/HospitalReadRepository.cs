using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.ReadRepository
{
    public class HospitalReadRepository : IReadContract<Hospital, int>
    {
        IReadDataAccess<Hospital, int> dataAccess;

        public HospitalReadRepository(IReadDataAccess<Hospital, int> dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        async Task<ResponseObject<Hospital>> IReadContract<Hospital, int>.GetAsync()
        {
            ResponseObject<Hospital> response = new();
            try
            {
                response = await dataAccess.ReadAsync();
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Hospital>> IReadContract<Hospital, int>.GetAsync(int id)
        {
            ResponseObject<Hospital> response = new();
            try
            {
                response = await dataAccess.ReadAsync(id);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
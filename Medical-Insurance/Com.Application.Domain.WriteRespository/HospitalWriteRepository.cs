using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.WriteRepository
{
    public class HospitalWriteRepository : IWriteContract<Hospital, int>
    {
        IWriteDataAccess<Hospital, int> dataAccess;

        public HospitalWriteRepository(IWriteDataAccess<Hospital, int> dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        async Task<ResponseObject<Hospital>> IWriteContract<Hospital, int>.CreateAsync(Hospital entity)
        {
            ResponseObject<Hospital> response = new();
            try
            {
                response = await dataAccess.AddAsync(entity);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Hospital>> IWriteContract<Hospital, int>.UpdateAsync(int id, Hospital entity)
        {
            ResponseObject<Hospital> response = new();
            try
            {
                entity.HospitalId = id;
                response = await dataAccess.UpdateAsync(entity);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Hospital>> IWriteContract<Hospital, int>.DeleteAsync(int id)
        {
            ResponseObject<Hospital> response = new();
            try
            {
                response = await dataAccess.DeleteAsync(id);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
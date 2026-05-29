using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.WriteRepository
{
    public class ClaimWriteRepository : IWriteContract<Claim, int>
    {
        IWriteDataAccess<Claim, int> dataAccess;

        public ClaimWriteRepository(IWriteDataAccess<Claim, int> dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        async Task<ResponseObject<Claim>> IWriteContract<Claim, int>.CreateAsync(Claim entity)
        {
            ResponseObject<Claim> response = new();
            try
            {
                response = await dataAccess.AddAsync(entity);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Claim>> IWriteContract<Claim, int>.UpdateAsync(int id, Claim entity)
        {
            ResponseObject<Claim> response = new();
            try
            {
                entity.ClaimId = id;
                response = await dataAccess.UpdateAsync(entity);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Claim>> IWriteContract<Claim, int>.DeleteAsync(int id)
        {
            ResponseObject<Claim> response = new();
            try
            {
                response = await dataAccess.DeleteAsync(id);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
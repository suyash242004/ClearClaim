using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.WriteRepository
{
    public class PolicyWriteRepository : IWriteContract<Policy, int>
    {
        IWriteDataAccess<Policy, int> dataAccess;

        public PolicyWriteRepository(IWriteDataAccess<Policy, int> dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        async Task<ResponseObject<Policy>> IWriteContract<Policy, int>.CreateAsync(Policy entity)
        {
            ResponseObject<Policy> response = new();
            try
            {
                response = await dataAccess.AddAsync(entity);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Policy>> IWriteContract<Policy, int>.UpdateAsync(int id, Policy entity)
        {
            ResponseObject<Policy> response = new();
            try
            {
                entity.PolicyId = id;
                response = await dataAccess.UpdateAsync(entity);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Policy>> IWriteContract<Policy, int>.DeleteAsync(int id)
        {
            ResponseObject<Policy> response = new();
            try
            {
                response = await dataAccess.DeleteAsync(id);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
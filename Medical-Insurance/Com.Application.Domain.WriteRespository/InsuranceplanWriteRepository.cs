using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.WriteRepository
{
    public class InsuranceplanWriteRepository : IWriteContract<Insuranceplan, int>
    {
        IWriteDataAccess<Insuranceplan, int> dataAccess;

        public InsuranceplanWriteRepository(IWriteDataAccess<Insuranceplan, int> dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        async Task<ResponseObject<Insuranceplan>> IWriteContract<Insuranceplan, int>.CreateAsync(Insuranceplan entity)
        {
            ResponseObject<Insuranceplan> response = new();
            try
            {
                response = await dataAccess.AddAsync(entity);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Insuranceplan>> IWriteContract<Insuranceplan, int>.UpdateAsync(int id, Insuranceplan entity)
        {
            ResponseObject<Insuranceplan> response = new();
            try
            {
                entity.PlanId = id;
                response = await dataAccess.UpdateAsync(entity);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Insuranceplan>> IWriteContract<Insuranceplan, int>.DeleteAsync(int id)
        {
            ResponseObject<Insuranceplan> response = new();
            try
            {
                response = await dataAccess.DeleteAsync(id);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.WriteRepository
{
    public class FamilymemberWriteRepository : IWriteContract<Familymember, int>
    {
        IWriteDataAccess<Familymember, int> dataAccess;

        public FamilymemberWriteRepository(IWriteDataAccess<Familymember, int> dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        async Task<ResponseObject<Familymember>> IWriteContract<Familymember, int>.CreateAsync(Familymember entity)
        {
            ResponseObject<Familymember> response = new();
            try
            {
                response = await dataAccess.AddAsync(entity);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Familymember>> IWriteContract<Familymember, int>.UpdateAsync(int id, Familymember entity)
        {
            ResponseObject<Familymember> response = new();
            try
            {
                entity.MemberId = id;
                response = await dataAccess.UpdateAsync(entity);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Familymember>> IWriteContract<Familymember, int>.DeleteAsync(int id)
        {
            ResponseObject<Familymember> response = new();
            try
            {
                response = await dataAccess.DeleteAsync(id);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Com.Application.Domain.WriteDataAccess.Models;

namespace Com.Application.Domain.WriteDataAccess
{
    public class FamilymemberWriteDataAccess : IWriteDataAccess<Familymember, int>
    {
        MedicalInsuranceContext ctx;

        public FamilymemberWriteDataAccess(MedicalInsuranceContext ctx)
        {
            //ctx = new MedicalInsuranceContext();
            this.ctx = ctx;
        }

        public async Task<ResponseObject<Familymember>> AddAsync(Familymember entity)
        {
            ResponseObject<Familymember> response = new();
            try
            {
                var result = await ctx.Familymembers.AddAsync(entity);
                await ctx.SaveChangesAsync();
                response.Record = result.Entity;
                response.Message = "New Family Member added successfully.";
                response.ResponseCode = 200;
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Familymember>> UpdateAsync(Familymember entity)
        {
            ResponseObject<Familymember> response = new();
            try
            {
                var recoUpdate = await ctx.Familymembers.FindAsync(entity.MemberId);
                if (recoUpdate != null)
                {
                    recoUpdate.MemberName = entity.MemberName;
                    recoUpdate.Relation = entity.Relation;
                    recoUpdate.Age = entity.Age;
                    recoUpdate.Gender = entity.Gender;
                    response.Record = recoUpdate;
                    await ctx.SaveChangesAsync();
                    response.Message = $"Family Member with MemberId {entity.MemberId} updated successfully.";
                    response.ResponseCode = 200;
                }
                else
                {
                    throw new Exception($"Family Member with MemberId {entity.MemberId} does not exist.");
                }
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Familymember>> DeleteAsync(int id)
        {
            ResponseObject<Familymember> response = new();
            try
            {
                var recoToDelete = await ctx.Familymembers.FindAsync(id);
                if (recoToDelete != null)
                {
                    response.Record = recoToDelete;
                    ctx.Familymembers.Remove(recoToDelete);
                    await ctx.SaveChangesAsync();
                    response.Message = $"Family Member with MemberId {id} deleted successfully.";
                    response.ResponseCode = 200;
                }
                else
                {
                    throw new Exception($"Family Member with MemberId {id} does not exist.");
                }
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
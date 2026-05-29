using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Com.Application.Domain.WriteDataAccess.Models;

namespace Com.Application.Domain.WriteDataAccess
{
    public class InsuranceplanWriteDataAccess : IWriteDataAccess<Insuranceplan, int>
    {
        MedicalInsuranceContext ctx;

        public InsuranceplanWriteDataAccess(MedicalInsuranceContext ctx)
        {
            //ctx = new MedicalInsuranceContext();
            this.ctx = ctx;
        }

        public async Task<ResponseObject<Insuranceplan>> AddAsync(Insuranceplan entity)
        {
            ResponseObject<Insuranceplan> response = new();
            try
            {
                var result = await ctx.Insuranceplans.AddAsync(entity);
                await ctx.SaveChangesAsync();
                response.Record = result.Entity;
                response.Message = "New Insurance Plan added successfully.";
                response.ResponseCode = 200;
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Insuranceplan>> UpdateAsync(Insuranceplan entity)
        {
            ResponseObject<Insuranceplan> response = new();
            try
            {
                var recoUpdate = await ctx.Insuranceplans.FindAsync(entity.PlanId);
                if (recoUpdate != null)
                {

                    recoUpdate.PlanName = entity.PlanName;
                    recoUpdate.PremiumAmount = entity.PremiumAmount;
                    recoUpdate.CoverageAmount = entity.CoverageAmount;
                    recoUpdate.MaxMembers = entity.MaxMembers;
                    recoUpdate.PolicyDuration = entity.PolicyDuration;
                    response.Record = recoUpdate;
                    await ctx.SaveChangesAsync();
                    response.Message = $"Insurance Plan with PlanId {entity.PlanId} updated successfully.";
                    response.ResponseCode = 200;
                }
                else
                {
                    throw new Exception($"Insurance Plan with PlanId {entity.PlanId} does not exist.");
                }
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Insuranceplan>> DeleteAsync(int id)
        {
            ResponseObject<Insuranceplan> response = new();
            try
            {
                var recoToDelete = await ctx.Insuranceplans.FindAsync(id);
                if (recoToDelete != null)
                {
                    response.Record = recoToDelete;
                    ctx.Insuranceplans.Remove(recoToDelete);
                    await ctx.SaveChangesAsync();
                    response.Message = $"Insurance Plan with PlanId {id} deleted successfully.";
                    response.ResponseCode = 200;
                }
                else
                {
                    throw new Exception($"Insurance Plan with PlanId {id} does not exist.");
                }
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
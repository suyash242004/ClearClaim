using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Com.Application.Domain.WriteDataAccess.Models;

namespace Com.Application.Domain.WriteDataAccess
{
    public class PolicyWriteDataAccess : IWriteDataAccess<Policy, int>
    {
        MedicalInsuranceContext ctx;

        public PolicyWriteDataAccess(MedicalInsuranceContext ctx)
        {
            // Deppendency Injection means injecting the dependency (MedicalInsuranceContext) into the class (PolicyWriteDataAccess) rather than creating an instance of it inside the class.
            // It allows us to decouple the class from the specific implementation of the dependency, making it easier to test and maintain.

            this.ctx = ctx;
            //ctx = new MedicalInsuranceContext();
        }
        async public Task<ResponseObject<Policy>> AddAsync(Policy entity)
        {
            ResponseObject<Policy> response = new ResponseObject<Policy>();
            try
            {
                var result = await ctx.Policys.AddAsync(entity);
                await ctx.SaveChangesAsync();
                response.Record = result.Entity;
                response.Message = "New Policy is Added Successfully";
                response.ResponseCode = 200;

            }
            catch (Exception ex)
            {

                throw ex;
            }
            return response;
        }

        async public Task<ResponseObject<Policy>> DeleteAsync(int id)
        {
            ResponseObject<Policy> response = new();
            try
            {
                var recoToDelete = await ctx.Policys.FindAsync(id);
                if (recoToDelete != null)
                {
                    response.Record = recoToDelete;
                    ctx.Policys.Remove(recoToDelete);
                    await ctx.SaveChangesAsync();
                    response.Message = $"Policy with PolicyId {id} is Deleted Successfully";
                    response.ResponseCode = 200;
                }
                else
                {
                    throw new Exception($"Policy with PolicyId {id} does not exist");
                }

            }
            catch (Exception ex)
            {

                throw ex;
            }

            return response;

        }

        async public Task<ResponseObject<Policy>> UpdateAsync(Policy entity)
        {
            ResponseObject<Policy> response = new();
            try
            {
                var recoUpdate = await ctx.Policys.FindAsync(entity.PolicyId);
                if (recoUpdate != null)
                {
                    recoUpdate.CustomerId = entity.CustomerId;
                    recoUpdate.PlanId = entity.PlanId;
                    recoUpdate.StartDate = entity.StartDate;
                    recoUpdate.EndDate = entity.EndDate;
                    recoUpdate.IsActive = entity.IsActive;
                    recoUpdate.RenewalCount = entity.RenewalCount;
                    response.Record = recoUpdate;
                    await ctx.SaveChangesAsync();
                    response.Message = $"Policy with PolicyId {entity.PolicyId} is Updated Successfully";
                    response.ResponseCode = 200;
                }
                else {
                    throw new Exception($"Policy with PolicyId {entity.PolicyId} does not exist");
                }

            }
            catch (Exception ex)
            {

                throw ex;
            }

            return response;
        }
    }
}

using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Com.Application.Domain.WriteDataAccess.Models;

namespace Com.Application.Domain.WriteDataAccess
{
    public class ClaimWriteDataAccess : IWriteDataAccess<Claim, int>
    {
        MedicalInsuranceContext ctx;

        public ClaimWriteDataAccess(MedicalInsuranceContext ctx)
        {
            //ctx = new MedicalInsuranceContext();
            this.ctx = ctx;
        }

        public async Task<ResponseObject<Claim>> AddAsync(Claim entity)
        {
            ResponseObject<Claim> response = new();
            try
            {
                var result = await ctx.Claims.AddAsync(entity);
                await ctx.SaveChangesAsync();
                response.Record = result.Entity;
                response.Message = "New Claim added successfully.";
                response.ResponseCode = 200;
            }
            //catch (Exception ex) { throw ex; }
            catch (Exception ex)
            {
                throw new Exception(
                    ex.InnerException?.InnerException?.Message ??
                    ex.InnerException?.Message ??
                    ex.Message
                );
            }
            return response;
        }

        public async Task<ResponseObject<Claim>> UpdateAsync(Claim entity)
        {
            ResponseObject<Claim> response = new();
            try
            {
                var recoUpdate = await ctx.Claims.FindAsync(entity.ClaimId);
                if (recoUpdate != null)
                {
                    recoUpdate.PolicyId = entity.PolicyId;
                    recoUpdate.HospitalId = entity.HospitalId;
                    recoUpdate.ClaimDate = entity.ClaimDate;
                    recoUpdate.ClaimAmount = entity.ClaimAmount;
                    recoUpdate.Disease = entity.Disease;
                    recoUpdate.DoctorName = entity.DoctorName;
                    recoUpdate.Description = entity.Description;
                    response.Record = recoUpdate;
                    await ctx.SaveChangesAsync();
                    response.Message = $"Claim with ClaimId {entity.ClaimId} updated successfully.";
                    response.ResponseCode = 200;
                }
                else
                {
                    throw new Exception($"Claim with ClaimId {entity.ClaimId} does not exist.");
                }
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Claim>> DeleteAsync(int id)
        {
            ResponseObject<Claim> response = new();
            try
            {
                var recoToDelete = await ctx.Claims.FindAsync(id);
                if (recoToDelete != null)
                {
                    response.Record = recoToDelete;
                    ctx.Claims.Remove(recoToDelete);
                    await ctx.SaveChangesAsync();
                    response.Message = $"Claim with ClaimId {id} deleted successfully.";
                    response.ResponseCode = 200;
                }
                else
                {
                    throw new Exception($"Claim with ClaimId {id} does not exist.");
                }
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
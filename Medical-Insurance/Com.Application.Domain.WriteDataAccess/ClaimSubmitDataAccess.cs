using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Com.Application.Domain.WriteDataAccess.Models;

namespace Com.Application.Domain.WriteDataAccess
{
    public class ClaimSubmitDataAccess : IClaimSubmitDataAccess
    {
        MedicalInsuranceContext ctx;

        public ClaimSubmitDataAccess(MedicalInsuranceContext ctx)
        {
            this.ctx = ctx;
        }

        public async Task<ResponseObject<Claim>> SubmitClaimAsync(int policyId, int hospitalId, decimal claimAmount, string disease, string doctorName, string? description)
        {
            ResponseObject<Claim> response = new();
            try
            {
                // 1. Check policy exists and is active
                var policy = await ctx.Policys.FindAsync(policyId);
                if (policy == null)
                    throw new Exception($"Policy with ID {policyId} does not exist.");

                if (policy.IsActive == false)
                    throw new Exception($"Policy with ID {policyId} is inactive.");

                // 2. Check hospital exists
                var hospital = await ctx.Hospitals.FindAsync(hospitalId);
                if (hospital == null)
                    throw new Exception($"Hospital with ID {hospitalId} does not exist.");

                // 3. Create claim — triggers in DB will validate
                // hospital coverage, claim amount limit, date range
                var newClaim = new Claim
                {
                    PolicyId = policyId,
                    HospitalId = hospitalId,
                    ClaimDate = DateOnly.FromDateTime(DateTime.Today),
                    ClaimAmount = claimAmount,
                    Disease = disease,
                    DoctorName = doctorName,
                    Description = description,
                    Status = "Pending"
                };

                var result = await ctx.Claims.AddAsync(newClaim);
                await ctx.SaveChangesAsync();

                response.Record = result.Entity;
                response.Message = "Claim submitted successfully. Status is Pending.";
                response.ResponseCode = 200;
            }
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
    }
}
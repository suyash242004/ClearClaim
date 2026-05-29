using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Com.Application.Domain.WriteDataAccess.Models;

namespace Com.Application.Domain.WriteDataAccess
{
    public class AdminClaimWriteDataAccess : IAdminClaimDataAccess
    {
        MedicalInsuranceContext ctx;

        public AdminClaimWriteDataAccess(MedicalInsuranceContext ctx)
        {
            this.ctx = ctx;
        }

        public Task<ResponseObject<Claim>> GetPendingClaimsAsync()
        {
            throw new NotImplementedException();
        }

        public async Task<ResponseObject<Claim>> ApproveClaimAsync(int claimId)
        {
            ResponseObject<Claim> response = new();
            try
            {
                var claim = await ctx.Claims.FindAsync(claimId);
                if (claim == null)
                    throw new Exception($"Claim with ID {claimId} does not exist.");

                if (claim.Status != "Pending")
                    throw new Exception($"Claim with ID {claimId} is already {claim.Status}.");

                claim.Status = "Approved";
                await ctx.SaveChangesAsync();

                response.Record = claim;
                response.Message = $"Claim {claimId} approved successfully.";
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

        public async Task<ResponseObject<Claim>> RejectClaimAsync(int claimId)
        {
            ResponseObject<Claim> response = new();
            try
            {
                var claim = await ctx.Claims.FindAsync(claimId);
                if (claim == null)
                    throw new Exception($"Claim with ID {claimId} does not exist.");

                if (claim.Status != "Pending")
                    throw new Exception($"Claim with ID {claimId} is already {claim.Status}.");

                claim.Status = "Rejected";
                await ctx.SaveChangesAsync();

                response.Record = claim;
                response.Message = $"Claim {claimId} rejected successfully.";
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
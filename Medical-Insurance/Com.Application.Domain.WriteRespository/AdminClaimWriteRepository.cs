using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.WriteRepository
{
    public class AdminClaimWriteRepository : IAdminClaimContract
    {
        IAdminClaimDataAccess dataAccess;

        public AdminClaimWriteRepository(IAdminClaimDataAccess dataAccess)
        {
            this.dataAccess = dataAccess;
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
                if (claimId <= 0)
                    throw new Exception("Invalid Claim ID.");

                response = await dataAccess.ApproveClaimAsync(claimId);
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
                if (claimId <= 0)
                    throw new Exception("Invalid Claim ID.");

                response = await dataAccess.RejectClaimAsync(claimId);
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
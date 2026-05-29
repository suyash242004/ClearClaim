using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.ReadRepository
{
    public class AdminClaimReadRepository : IAdminClaimContract
    {
        IAdminClaimDataAccess dataAccess;

        public AdminClaimReadRepository(IAdminClaimDataAccess dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        public async Task<ResponseObject<Claim>> GetPendingClaimsAsync()
        {
            ResponseObject<Claim> response = new();
            try
            {
                response = await dataAccess.GetPendingClaimsAsync();
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

        public Task<ResponseObject<Claim>> ApproveClaimAsync(int claimId)
        {
            throw new NotImplementedException();
        }

        public Task<ResponseObject<Claim>> RejectClaimAsync(int claimId)
        {
            throw new NotImplementedException();
        }
    }
}
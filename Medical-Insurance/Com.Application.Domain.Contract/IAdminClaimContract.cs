using Com.Application.Domain.Entities;

namespace Com.Application.Domain.Contract
{
    public interface IAdminClaimContract
    {
        Task<ResponseObject<Claim>> GetPendingClaimsAsync();
        Task<ResponseObject<Claim>> GetClaimsWithAiDataAsync();
        Task<ResponseObject<Claim>> ApproveClaimAsync(int claimId);
        Task<ResponseObject<Claim>> RejectClaimAsync(int claimId);
    }
}
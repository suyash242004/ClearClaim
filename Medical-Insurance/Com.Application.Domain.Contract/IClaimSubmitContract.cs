using Com.Application.Domain.Entities;

namespace Com.Application.Domain.Contract
{
    public interface IClaimSubmitContract
    {
        Task<ResponseObject<Claim>> SubmitClaimAsync(int policyId, int hospitalId, decimal claimAmount, string disease, string doctorName, string? description);
    }
}
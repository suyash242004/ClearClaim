using Com.Application.Domain.Entities;

namespace Com.Application.Domain.DataAccessContract
{
    public interface IClaimSubmitDataAccess
    {
        Task<ResponseObject<Claim>> SubmitClaimAsync(int policyId, int hospitalId, decimal claimAmount, string disease, string doctorName, string? description);
    }
}
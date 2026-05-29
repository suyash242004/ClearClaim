using Com.Application.Domain.Entities;

namespace Com.Application.Domain.Contract
{
    public interface IHospitalContract
    {
        Task<ResponseObject<Claim>> GetHospitalClaimsAsync(int hospitalId);
        Task<ResponseObject<Claim>> GetHospitalClaimsByStatusAsync(int hospitalId, string status);
    }
}
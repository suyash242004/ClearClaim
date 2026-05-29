using Com.Application.Domain.Entities;

namespace Com.Application.Domain.DataAccessContract
{
    public interface IHospitalDataAccess
    {
        Task<ResponseObject<Claim>> GetHospitalClaimsAsync(int hospitalId);
        Task<ResponseObject<Claim>> GetHospitalClaimsByStatusAsync(int hospitalId, string status);
    }
}
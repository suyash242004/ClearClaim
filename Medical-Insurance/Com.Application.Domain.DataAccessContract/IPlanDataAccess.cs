using Com.Application.Domain.Entities;

namespace Com.Application.Domain.DataAccessContract
{
    public interface IPlanDataAccess
    {
        Task<ResponseObject<Insuranceplan>> SearchPlansAsync(string? city, decimal? maxPremium, int? minCoverage);
        Task<ResponseObject<Insuranceplan>> ComparePlansAsync(List<int> planIds);
        Task<ResponseObject<Hospital>> GetHospitalsByPlanAsync(int planId);
    }
}
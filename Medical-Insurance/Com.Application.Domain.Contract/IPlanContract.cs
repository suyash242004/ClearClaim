using Com.Application.Domain.Entities;

namespace Com.Application.Domain.Contract
{
    public interface IPlanContract
    {
        // Get all plans with optional filters
        Task<ResponseObject<Insuranceplan>> SearchPlansAsync(string? city, decimal? maxPremium, int? minCoverage);

        // Compare multiple plans by their IDs
        Task<ResponseObject<Insuranceplan>> ComparePlansAsync(List<int> planIds);

        // Get all hospitals under a specific plan
        Task<ResponseObject<Hospital>> GetHospitalsByPlanAsync(int planId);
    }
}
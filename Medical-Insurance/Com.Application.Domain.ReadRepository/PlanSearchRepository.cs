using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.ReadRepository
{
    public class PlanSearchRepository : IPlanContract
    {
        IPlanDataAccess dataAccess;

        public PlanSearchRepository(IPlanDataAccess dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        public async Task<ResponseObject<Insuranceplan>> SearchPlansAsync(string? city, decimal? maxPremium, int? minCoverage)
        {
            ResponseObject<Insuranceplan> response = new();
            try
            {
                response = await dataAccess.SearchPlansAsync(city, maxPremium, minCoverage);
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

        public async Task<ResponseObject<Insuranceplan>> ComparePlansAsync(List<int> planIds)
        {
            ResponseObject<Insuranceplan> response = new();
            try
            {
                response = await dataAccess.ComparePlansAsync(planIds);
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

        public async Task<ResponseObject<Hospital>> GetHospitalsByPlanAsync(int planId)
        {
            ResponseObject<Hospital> response = new();
            try
            {
                if (planId <= 0) throw new Exception("Invalid Plan ID.");
                response = await dataAccess.GetHospitalsByPlanAsync(planId);
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
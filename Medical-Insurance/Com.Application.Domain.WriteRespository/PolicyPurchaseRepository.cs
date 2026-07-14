using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.WriteRepository
{
    public class PolicyPurchaseRepository : IPolicyPurchaseContract
    {
        IPolicyPurchaseDataAccess dataAccess;

        public PolicyPurchaseRepository(IPolicyPurchaseDataAccess dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        public async Task<ResponseObject<Policy>> PurchasePolicyAsync(int customerId, int planId, DateOnly startDate)
        {
            ResponseObject<Policy> response = new();
            try
            {
                // Validate inputs before hitting DataAccess
                if (customerId <= 0)
                    throw new Exception("Invalid Customer ID.");

                if (planId <= 0)
                    throw new Exception("Invalid Plan ID.");

                if (startDate < DateOnly.FromDateTime(DateTime.Today.AddDays(-2)))
                    throw new Exception("Start date cannot be in the past.");

                response = await dataAccess.PurchasePolicyAsync(customerId, planId, startDate);
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
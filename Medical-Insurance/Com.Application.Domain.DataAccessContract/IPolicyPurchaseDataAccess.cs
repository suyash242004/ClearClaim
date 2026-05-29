using Com.Application.Domain.Entities;

namespace Com.Application.Domain.DataAccessContract
{
    public interface IPolicyPurchaseDataAccess
    {
        Task<ResponseObject<Policy>> PurchasePolicyAsync(int customerId, int planId, DateOnly startDate);
    }
}
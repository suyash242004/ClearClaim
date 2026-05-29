using Com.Application.Domain.Entities;

namespace Com.Application.Domain.Contract
{
    public interface IPolicyPurchaseContract
    {
        Task<ResponseObject<Policy>> PurchasePolicyAsync(int customerId, int planId, DateOnly startDate);
    }
}
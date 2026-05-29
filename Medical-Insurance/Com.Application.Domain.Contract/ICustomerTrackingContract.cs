using Com.Application.Domain.Entities;

namespace Com.Application.Domain.Contract
{
    public interface ICustomerTrackingContract
    {
        Task<ResponseObject<Policy>> GetCustomerPoliciesAsync(int customerId);
        Task<ResponseObject<Claim>> GetCustomerClaimsAsync(int customerId);
    }
}
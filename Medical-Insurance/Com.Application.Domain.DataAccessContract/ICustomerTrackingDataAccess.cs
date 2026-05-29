using Com.Application.Domain.Entities;

namespace Com.Application.Domain.DataAccessContract
{
    public interface ICustomerTrackingDataAccess
    {
        Task<ResponseObject<Policy>> GetCustomerPoliciesAsync(int customerId);
        Task<ResponseObject<Claim>> GetCustomerClaimsAsync(int customerId);
    }
}
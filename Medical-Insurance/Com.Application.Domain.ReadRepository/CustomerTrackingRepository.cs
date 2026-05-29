using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.ReadRepository
{
    public class CustomerTrackingRepository : ICustomerTrackingContract
    {
        ICustomerTrackingDataAccess dataAccess;

        public CustomerTrackingRepository(ICustomerTrackingDataAccess dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        public async Task<ResponseObject<Policy>> GetCustomerPoliciesAsync(int customerId)
        {
            ResponseObject<Policy> response = new();
            try
            {
                if (customerId <= 0)
                    throw new Exception("Invalid Customer ID.");

                response = await dataAccess.GetCustomerPoliciesAsync(customerId);

                if (!response.Records.Any())
                    throw new Exception($"No policies found for Customer ID {customerId}.");
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

        public async Task<ResponseObject<Claim>> GetCustomerClaimsAsync(int customerId)
        {
            ResponseObject<Claim> response = new();
            try
            {
                if (customerId <= 0)
                    throw new Exception("Invalid Customer ID.");

                response = await dataAccess.GetCustomerClaimsAsync(customerId);

                if (!response.Records.Any())
                    throw new Exception($"No claims found for Customer ID {customerId}.");
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
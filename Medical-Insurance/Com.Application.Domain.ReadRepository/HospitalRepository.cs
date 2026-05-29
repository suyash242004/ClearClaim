using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.ReadRepository
{
    public class HospitalRepository : IHospitalContract
    {
        IHospitalDataAccess dataAccess;

        public HospitalRepository(IHospitalDataAccess dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        public async Task<ResponseObject<Claim>> GetHospitalClaimsAsync(int hospitalId)
        {
            ResponseObject<Claim> response = new();
            try
            {
                if (hospitalId <= 0)
                    throw new Exception("Invalid Hospital ID.");

                response = await dataAccess.GetHospitalClaimsAsync(hospitalId);

                if (!response.Records.Any())
                    throw new Exception($"No claims found for Hospital ID {hospitalId}.");
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

        public async Task<ResponseObject<Claim>> GetHospitalClaimsByStatusAsync(int hospitalId, string status)
        {
            ResponseObject<Claim> response = new();
            try
            {
                if (hospitalId <= 0)
                    throw new Exception("Invalid Hospital ID.");

                var validStatuses = new[] { "Pending", "Approved", "Rejected" };
                if (!validStatuses.Contains(status))
                    throw new Exception("Invalid status. Valid values: Pending, Approved, Rejected.");

                response = await dataAccess.GetHospitalClaimsByStatusAsync(hospitalId, status);

                if (!response.Records.Any())
                    throw new Exception($"No {status} claims found for Hospital ID {hospitalId}.");
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
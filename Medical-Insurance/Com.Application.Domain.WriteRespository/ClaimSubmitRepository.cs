using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.WriteRepository
{
    public class ClaimSubmitRepository : IClaimSubmitContract
    {
        IClaimSubmitDataAccess dataAccess;

        public ClaimSubmitRepository(IClaimSubmitDataAccess dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        public async Task<ResponseObject<Claim>> SubmitClaimAsync(int policyId, int hospitalId, decimal claimAmount, string disease, string doctorName, string? description)
        {
            ResponseObject<Claim> response = new();
            try
            {
                if (policyId <= 0)
                    throw new Exception("Invalid Policy ID.");

                if (hospitalId <= 0)
                    throw new Exception("Invalid Hospital ID.");

                if (claimAmount <= 0)
                    throw new Exception("Claim amount must be greater than zero.");

                if (string.IsNullOrEmpty(disease))
                    throw new Exception("Disease is required.");

                if (string.IsNullOrEmpty(doctorName))
                    throw new Exception("Doctor name is required.");

                response = await dataAccess.SubmitClaimAsync(policyId, hospitalId, claimAmount, disease, doctorName, description);
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
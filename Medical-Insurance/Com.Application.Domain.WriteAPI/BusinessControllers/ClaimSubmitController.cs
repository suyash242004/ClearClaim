using Com.Application.Domain.Contract;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.WriteAPI.Controllers.BusinessControllers
{
    [Route("api/claims")]
    [ApiController]
    public class ClaimSubmitController : ControllerBase
    {
        private IClaimSubmitContract repo;

        public ClaimSubmitController(IClaimSubmitContract repo)
        {
            this.repo = repo;
        }

        // POST /api/claims/submit
        [HttpPost("submit")]
        public async Task<IActionResult> SubmitClaim(
            [FromQuery] int policyId,
            [FromQuery] int hospitalId,
            [FromQuery] decimal claimAmount,
            [FromQuery] string disease,
            [FromQuery] string doctorName,
            [FromQuery] string? description)
        {
            //try
            //{

            if (policyId <= 0) throw new Exception("Invalid policy ID.");
            if (hospitalId <= 0) throw new Exception("Invalid hospital ID.");
            if (claimAmount <= 0) throw new Exception("Claim amount must be greater than 0.");
            if (string.IsNullOrWhiteSpace(disease)) throw new Exception("Disease is required.");
            if (string.IsNullOrWhiteSpace(doctorName)) throw new Exception("Doctor name is required.");

            var response = await repo.SubmitClaimAsync(policyId, hospitalId, claimAmount, disease, doctorName, description);
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
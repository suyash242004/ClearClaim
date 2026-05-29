using Com.Application.Domain.Contract;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.WriteAPI.Controllers.BusinessControllers
{
    [Route("api/admin/claims")]
    [ApiController]
    public class AdminClaimWriteController : ControllerBase
    {
        private IAdminClaimContract repo;

        public AdminClaimWriteController(IAdminClaimContract repo)
        {
            this.repo = repo;
        }

        // PUT /api/admin/claims/approve/5
        [HttpPut("approve/{claimId}")]
        public async Task<IActionResult> ApproveClaim(int claimId)
        {
            //try
            //{
            if (claimId <= 0) throw new Exception("Invalid claim ID.");
            var response = await repo.ApproveClaimAsync(claimId);
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }

        // PUT /api/admin/claims/reject/5
        [HttpPut("reject/{claimId}")]
        public async Task<IActionResult> RejectClaim(int claimId)
        {
            //try
            //{
            if (claimId <= 0) throw new Exception("Invalid claim ID.");
            var response = await repo.RejectClaimAsync(claimId);
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
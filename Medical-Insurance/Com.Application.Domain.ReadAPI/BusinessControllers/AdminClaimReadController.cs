using Com.Application.Domain.Contract;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.ReadAPI.Controllers.BusinessControllers
{
    [Route("api/admin/claims")]
    [ApiController]
    public class AdminClaimReadController : ControllerBase
    {
        private IAdminClaimContract repo;

        public AdminClaimReadController(IAdminClaimContract repo)
        {
            this.repo = repo;
        }

        // GET /api/admin/claims/pending
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingClaims()
        {
            //try
            //{
                var response = await repo.GetPendingClaimsAsync();
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
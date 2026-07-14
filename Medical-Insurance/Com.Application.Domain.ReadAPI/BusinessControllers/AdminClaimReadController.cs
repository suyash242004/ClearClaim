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
            var response = await repo.GetPendingClaimsAsync();
            return Ok(response);
        }

        // GET /api/admin/claims/with-ai
        // Returns all claims including AI decision, fraud score, tx hash columns.
        // Used by frontend to load persisted AI data on page mount.
        [HttpGet("with-ai")]
        public async Task<IActionResult> GetClaimsWithAiData()
        {
            var response = await repo.GetClaimsWithAiDataAsync();
            return Ok(response);
        }
    }
}
using Com.Application.Domain.Contract;
using Com.Application.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.ReadAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ClaimReadController : ControllerBase
    {
        private IReadContract<Claim, int> repo;

        public ClaimReadController(IReadContract<Claim, int> repo)
        {
            this.repo = repo;
        }

        [HttpGet]
        public async Task<IActionResult> GetClaims()
        {
            try
            {
                var claims = await repo.GetAsync();
                return Ok(claims);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetClaim(int id)
        {
            //try
            //{
                var claim = await repo.GetAsync(id);
                if (claim.Record == null)
                {
                    return NotFound($"Claim with ID {id} not found.");
                }
                return Ok(claim);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
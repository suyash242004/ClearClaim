using Com.Application.Domain.Contract;
using Com.Application.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.ReadAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PolicyReadController : ControllerBase
    {
        private IReadContract<Policy, int> repo;

        public PolicyReadController(IReadContract<Policy, int> repo)
        {
            this.repo = repo;
        }

        [HttpGet]
        public async Task<IActionResult> GetPolicies()
        {
            //try
            //{
                var policies = await repo.GetAsync();
                return Ok(policies);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetPolicy(int id)
        {
            //try
            //{
                var policy = await repo.GetAsync(id);
                if (policy.Record == null)
                {
                    return NotFound($"Policy with ID {id} not found.");
                }
                return Ok(policy);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
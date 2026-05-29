using Com.Application.Domain.Contract;
using Com.Application.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.ReadAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InsuranceplanReadController : ControllerBase
    {
        private IReadContract<Insuranceplan, int> repo;

        public InsuranceplanReadController(IReadContract<Insuranceplan, int> repo)
        {
            this.repo = repo;
        }

        [HttpGet]
        public async Task<IActionResult> GetInsuranceplans()
        {
            //try
            //{
                var plans = await repo.GetAsync();
                return Ok(plans);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetInsuranceplan(int id)
        {
            //try
            //{
                var plan = await repo.GetAsync(id);
                if (plan.Record == null)
                {
                    return NotFound($"Insurance plan with ID {id} not found.");
                }
                return Ok(plan);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
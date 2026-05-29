using Com.Application.Domain.Contract;
using Com.Application.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.ReadAPI.Controllers.BusinessControllers
{
    [Route("api/plans")]
    [ApiController]
    public class PlanSearchController : ControllerBase
    {
        private IPlanContract repo;

        public PlanSearchController(IPlanContract repo)
        {
            this.repo = repo;
        }

        // GET /api/plans/search?city=Pune&maxPremium=10000&minCoverage=500000
        [HttpGet("search")]
        public async Task<IActionResult> SearchPlans(
            [FromQuery] string? city,
            [FromQuery] decimal? maxPremium,
            [FromQuery] int? minCoverage)
        {
            try
            {
                if (city == null && maxPremium == null && minCoverage == null)
                    throw new Exception("Please provide at least one search filter.");

                var response = await repo.SearchPlansAsync(city, maxPremium, minCoverage);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET /api/plans/compare?planIds=1&planIds=2&planIds=3
        [HttpGet("compare")]
        public async Task<IActionResult> ComparePlans([FromQuery] List<int> planIds)
        {
            try
            {
                if (planIds == null || planIds.Count < 2)
                    throw new Exception("Please provide at least 2 plan IDs to compare.");

                var response = await repo.ComparePlansAsync(planIds);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET /api/plans/5/hospitals
        [HttpGet("{planId}/hospitals")]
        public async Task<IActionResult> GetHospitalsByPlan(int planId)
        {
            //try
            //{
                if (planId <= 0) throw new Exception("Invalid Plan ID.");

                var response = await repo.GetHospitalsByPlanAsync(planId);
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
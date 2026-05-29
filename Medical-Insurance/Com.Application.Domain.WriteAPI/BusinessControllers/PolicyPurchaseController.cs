using Com.Application.Domain.Contract;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.WriteAPI.Controllers.BusinessControllers
{
    [Route("api/policies")]
    [ApiController]
    public class PolicyPurchaseController : ControllerBase
    {
        private IPolicyPurchaseContract repo;

        public PolicyPurchaseController(IPolicyPurchaseContract repo)
        {
            this.repo = repo;
        }

        // POST /api/policies/purchase
        [HttpPost("purchase")]
        public async Task<IActionResult> PurchasePolicy(
            [FromQuery] int customerId,
            [FromQuery] int planId,
            [FromQuery] DateOnly startDate)
        {
            //try
            //{
            if (customerId <= 0) throw new Exception("Invalid customer ID.");
            if (planId <= 0) throw new Exception("Invalid plan ID.");
            if (startDate < DateOnly.FromDateTime(DateTime.Today))
                throw new Exception("Start date cannot be in the past.");

            var response = await repo.PurchasePolicyAsync(customerId, planId, startDate);
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
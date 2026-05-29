using Com.Application.Domain.Contract;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.ReadAPI.Controllers.BusinessControllers
{
    [Route("api/customer")]
    [ApiController]
    public class CustomerTrackingController : ControllerBase
    {
        private ICustomerTrackingContract repo;

        public CustomerTrackingController(ICustomerTrackingContract repo)
        {
            this.repo = repo;
        }

        // GET /api/customer/101/policies
        [HttpGet("{customerId}/policies")]
        public async Task<IActionResult> GetCustomerPolicies(int customerId)
        {
            //try
            //{
                var response = await repo.GetCustomerPoliciesAsync(customerId);
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }

        // GET /api/customer/101/claims
        [HttpGet("{customerId}/claims")]
        public async Task<IActionResult> GetCustomerClaims(int customerId)
        {
            //try
            //{
                var response = await repo.GetCustomerClaimsAsync(customerId);
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
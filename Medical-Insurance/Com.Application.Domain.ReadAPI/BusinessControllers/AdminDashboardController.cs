using Com.Application.Domain.Contract;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.ReadAPI.Controllers.BusinessControllers
{
    [Route("api/admin")]
    [ApiController]
    public class AdminDashboardController : ControllerBase
    {
        private IAdminDashboardContract repo;

        public AdminDashboardController(IAdminDashboardContract repo)
        {
            this.repo = repo;
        }

        // GET /api/admin/dashboard
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardStats()
        {
            //try
            //{
                var response = await repo.GetDashboardStatsAsync();
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }

        // GET /api/admin/customers/search?city=Pune&profession=Doctor
        [HttpGet("customers/search")]
        public async Task<IActionResult> SearchCustomers(
            [FromQuery] string? city,
            [FromQuery] string? profession,
            [FromQuery] string? bloodGroup,
            [FromQuery] string? disease)
        {
            //try
            //{
                var response = await repo.SearchCustomersAsync(city, profession, bloodGroup, disease);
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
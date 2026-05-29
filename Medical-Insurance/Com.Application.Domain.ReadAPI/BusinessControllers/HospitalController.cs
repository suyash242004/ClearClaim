using Com.Application.Domain.Contract;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.ReadAPI.Controllers.BusinessControllers
{
    [Route("api/hospital")]
    [ApiController]
    public class HospitalController : ControllerBase
    {
        private IHospitalContract repo;

        public HospitalController(IHospitalContract repo)
        {
            this.repo = repo;
        }

        // GET /api/hospital/1/claims
        [HttpGet("{hospitalId}/claims")]
        public async Task<IActionResult> GetHospitalClaims(int hospitalId)
        {
            //try
            //{
                var response = await repo.GetHospitalClaimsAsync(hospitalId);
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }

        // GET /api/hospital/1/claims/Pending
        [HttpGet("{hospitalId}/claims/{status}")]
        public async Task<IActionResult> GetHospitalClaimsByStatus(int hospitalId, string status)
        {
            //try
            //{
                var response = await repo.GetHospitalClaimsByStatusAsync(hospitalId, status);
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
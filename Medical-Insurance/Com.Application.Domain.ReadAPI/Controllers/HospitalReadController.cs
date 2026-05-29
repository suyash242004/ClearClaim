using Com.Application.Domain.Contract;
using Com.Application.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.ReadAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HospitalReadController : ControllerBase
    {
        private IReadContract<Hospital, int> repo;

        public HospitalReadController(IReadContract<Hospital, int> repo)
        {
            this.repo = repo;
        }

        [HttpGet]
        public async Task<IActionResult> GetHospitals()
        {
            //try
            //{
                var hospitals = await repo.GetAsync();
                return Ok(hospitals);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetHospital(int id)
        {
            //try
            //{
                var hospital = await repo.GetAsync(id);
                if (hospital.Record == null)
                {
                    return NotFound($"Hospital with ID {id} not found.");
                }
                return Ok(hospital);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
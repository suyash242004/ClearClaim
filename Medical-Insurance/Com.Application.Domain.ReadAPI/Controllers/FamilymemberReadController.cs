using Com.Application.Domain.Contract;
using Com.Application.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.ReadAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FamilymemberReadController : ControllerBase
    {
        private IReadContract<Familymember, int> repo;

        public FamilymemberReadController(IReadContract<Familymember, int> repo)
        {
            this.repo = repo;
        }

        [HttpGet]
        public async Task<IActionResult> GetFamilymembers()
        {
            //try
            //{
                var members = await repo.GetAsync();
                return Ok(members);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetFamilymember(int id)
        {
            //try
            //{
                var member = await repo.GetAsync(id);
                if (member.Record == null)
                {
                    return NotFound($"Family member with ID {id} not found.");
                }
                return Ok(member);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
using Com.Application.Domain.Contract;
using Com.Application.Domain.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Com.Application.Domain.WriteAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FamilymemberWriteController : ControllerBase
    {
        private IWriteContract<Familymember, int> repo;
        private IValidator<Familymember> validator;

        public FamilymemberWriteController(IWriteContract<Familymember, int> repo, IValidator<Familymember> validator)
        {
            this.repo = repo;
            this.validator = validator;    
        }

        [HttpPost]
        public async Task<IActionResult> CreateFamilymember(Familymember entity)
        {
            //try
            //{
                var modelValidationResult = await validator.ValidateAsync(entity);
                if (!modelValidationResult.IsValid)
                {
                    throw new Exception($"These is error in Model {JsonSerializer.Serialize(modelValidationResult)}");
                }
                var response = await repo.CreateAsync(entity);
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateFamilymember(int id, Familymember entity)
        {
            //try
            //{
                var modelValidationResult = await validator.ValidateAsync(entity);
                if (!modelValidationResult.IsValid)
                {
                    throw new Exception($"These is error in Model {JsonSerializer.Serialize(modelValidationResult)}");
                }
                if (id != entity.MemberId) throw new Exception("Id value does not match");
                var response = await repo.UpdateAsync(id, entity);
                if (response.Record == null) return NotFound($"Family Member with ID {id} not found.");
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFamilymember(int id)
        {
            //try
            //{
                if (id <= 0) throw new Exception("Invalid Family Member ID");
                var response = await repo.DeleteAsync(id);
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }
}
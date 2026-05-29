using Com.Application.Domain.Contract;
using Com.Application.Domain.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Com.Application.Domain.WriteAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PolicyWriteController : ControllerBase
    {
        private IWriteContract<Policy, int> repo;
        private IValidator<Policy> validator;

        public PolicyWriteController(IWriteContract<Policy, int> repo, IValidator<Policy> validator)
        {
            this.repo = repo;
            this.validator = validator;
        }

        [HttpPost]
        public async Task<IActionResult> CreatePolicy(Policy entity)
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
        public async Task<IActionResult> UpdatePolicy(int id, Policy entity)
        {
            //try
            //{
                var modelValidationResult = await validator.ValidateAsync(entity);
                if (!modelValidationResult.IsValid)
                {
                    throw new Exception($"These is error in Model {JsonSerializer.Serialize(modelValidationResult)}");
                }
                if (id != entity.PolicyId) throw new Exception("Id value does not match");
                var response = await repo.UpdateAsync(id, entity);
                if (response.Record == null) return NotFound($"Policy with ID {id} not found.");
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePolicy(int id)
        {
            //try
            //{
                if (id <= 0) throw new Exception("Invalid Policy ID");
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
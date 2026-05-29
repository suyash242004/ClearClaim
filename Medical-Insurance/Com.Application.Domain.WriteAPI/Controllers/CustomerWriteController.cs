using Com.Application.Domain.Contract;
using Com.Application.Domain.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Com.Application.Domain.WriteAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerWriteController : ControllerBase
    {
        private IWriteContract<Customer, int> repo;
        private IValidator<Customer> validator;

        // This will inject the CustomerWriteRepository in this controller because it implements IWriteContract<Customer, int>
        // and we have registered it in the Dependency container in Program.cs

        // Inject the validator as well, so that we can validate the incoming Customer entity before performing any operations on it.
        public CustomerWriteController(IWriteContract<Customer, int> repo, IValidator<Customer> validator)
        {
            this.repo = repo;
            this.validator = validator;
        }

        [HttpPost]
        public async Task<IActionResult> CreateCustomer(Customer entity)
        {
            //try
            //{
                // let use the validator
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
       public async Task<IActionResult> UpdateCustomer(int id, Customer entity)
        {
            //try
            //{
                var modelValidationResult = await validator.ValidateAsync(entity);
                if (!modelValidationResult.IsValid)
                {
                    throw new Exception($"These is error in Model {JsonSerializer.Serialize(modelValidationResult)}");
                }
                if (id != entity.CustomerId) throw new Exception("Id value does not match");

                var response = await repo.UpdateAsync(id, entity);
                if (response.Record == null)
                {
                    return NotFound($"Customer with ID {id} not found.");
                }
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}

        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            //try
            //{
                if(id<=0) throw new Exception("Invalid customer ID");


                var response = await repo.DeleteAsync(id);
                if (response.Record == null)
                {
                    return NotFound($"Customer with ID {id} not found.");
                }
                return Ok(response);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }
    }

}

using Com.Application.Domain.Contract;
using Com.Application.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Com.Application.Domain.ReadAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerReadController : ControllerBase
    {
        private IReadContract<Customer, int> repo;

        // Injecting the Repository in the constructor
        // Hence the CustomerReadRepository will be used by this controller
        // because it implements IReadContract<Customer, int> and we have registered it in the Dependency container in Program.cs
        public CustomerReadController(IReadContract<Customer, int> repo)
        {
            this.repo = repo;
        }

        // click on repo to view it will show all dependecies of repo
        [HttpGet]
        public async Task<IActionResult> GetCustomers()
        {
            //try
            //{
                var customers = await repo.GetAsync();

                return Ok(customers);
            //}
            //catch (Exception ex)
            //{

            //    return BadRequest(ex.Message);
            //}
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetCustomer(int id)
        {
            //try
            //{
                var customer = await repo.GetAsync(id);
                if (customer.Record == null)
                {
                    return NotFound($"Customer with ID {id} not found.");
                }
                return Ok(customer);
            //}
            //catch (Exception ex)
            //{
            //    return BadRequest(ex.Message);
            //}
        }   
    }
}

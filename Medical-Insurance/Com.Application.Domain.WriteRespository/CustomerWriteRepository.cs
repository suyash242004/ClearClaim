using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.WriteRepository
{
    public class CustomerWriteRepository : IWriteContract<Customer, int>
    {
        IWriteDataAccess<Customer, int> dataAccess;

        public CustomerWriteRepository(IWriteDataAccess<Customer, int> dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        async Task<ResponseObject<Customer>> IWriteContract<Customer, int>.CreateAsync(Customer entity)
        {
            ResponseObject<Customer> response = new();
            try
            {
                response = await dataAccess.AddAsync(entity);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Customer>> IWriteContract<Customer, int>.UpdateAsync(int id, Customer entity)
        {
            ResponseObject<Customer> response = new();
            try
            {
                entity.CustomerId = id;
                response = await dataAccess.UpdateAsync(entity);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        async Task<ResponseObject<Customer>> IWriteContract<Customer, int>.DeleteAsync(int id)
        {
            ResponseObject<Customer> response = new();
            try
            {
                response = await dataAccess.DeleteAsync(id);
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Com.Application.Domain.WriteDataAccess.Models;

namespace Com.Application.Domain.WriteDataAccess
{
    public class CustomerWriteDataAccess : IWriteDataAccess<Customer, int>
    {
        MedicalInsuranceContext ctx;

        public CustomerWriteDataAccess(MedicalInsuranceContext ctx)
        {
            //ctx = new MedicalInsuranceContext();
            this.ctx = ctx;
        }

        public async Task<ResponseObject<Customer>> AddAsync(Customer entity)
        {
            ResponseObject<Customer> response = new();
            try
            {
                var result = await ctx.Customers.AddAsync(entity);
                await ctx.SaveChangesAsync();
                response.Record = result.Entity;
                response.Message = "New Customer added successfully.";
                response.ResponseCode = 200;
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Customer>> UpdateAsync(Customer entity)
        {
            ResponseObject<Customer> response = new();
            try
            {
                var recoUpdate = await ctx.Customers.FindAsync(entity.CustomerId);
                if (recoUpdate != null)
                {
                    recoUpdate.CustomerName = entity.CustomerName;
                    recoUpdate.CustomerEmail = entity.CustomerEmail;
                    recoUpdate.CustomerPhone = entity.CustomerPhone;
                    recoUpdate.Gender = entity.Gender;
                    recoUpdate.Age = entity.Age;
                    recoUpdate.City = entity.City;
                    recoUpdate.Profession = entity.Profession;
                    recoUpdate.BloodGroup = entity.BloodGroup;
                    recoUpdate.HistoricalDisease = entity.HistoricalDisease;
                    response.Record = recoUpdate;
                    await ctx.SaveChangesAsync();
                    response.Message = $"Customer with CustomerId {entity.CustomerId} updated successfully.";
                    response.ResponseCode = 200;
                }
                else
                {
                    throw new Exception($"Customer with CustomerId {entity.CustomerId} does not exist.");
                }
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Customer>> DeleteAsync(int id)
        {
            ResponseObject<Customer> response = new();
            try
            {
                var recoToDelete = await ctx.Customers.FindAsync(id);
                if (recoToDelete != null)
                {
                    response.Record = recoToDelete;
                    ctx.Customers.Remove(recoToDelete);
                    await ctx.SaveChangesAsync();
                    response.Message = $"Customer with CustomerId {id} deleted successfully.";
                    response.ResponseCode = 200;
                }
                else
                {
                    throw new Exception($"Customer with CustomerId {id} does not exist.");
                }
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
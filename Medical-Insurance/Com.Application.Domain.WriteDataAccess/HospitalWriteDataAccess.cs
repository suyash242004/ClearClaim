using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Com.Application.Domain.WriteDataAccess.Models;

namespace Com.Application.Domain.WriteDataAccess
{
    public class HospitalWriteDataAccess : IWriteDataAccess<Hospital, int>
    {
        MedicalInsuranceContext ctx;

        public HospitalWriteDataAccess(MedicalInsuranceContext ctx)
        {
            //ctx = new MedicalInsuranceContext();
            this.ctx = ctx;
        }

        public async Task<ResponseObject<Hospital>> AddAsync(Hospital entity)
        {
            ResponseObject<Hospital> response = new();
            try
            {
                var result = await ctx.Hospitals.AddAsync(entity);
                await ctx.SaveChangesAsync();
                response.Record = result.Entity;
                response.Message = "New Hospital added successfully.";
                response.ResponseCode = 200;
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Hospital>> UpdateAsync(Hospital entity)
        {
            ResponseObject<Hospital> response = new();
            try
            {
                var recoUpdate = await ctx.Hospitals.FindAsync(entity.HospitalId);
                if (recoUpdate != null)
                {
                    recoUpdate.HospitalName = entity.HospitalName;
                    recoUpdate.City = entity.City;
                    recoUpdate.IsCashless = entity.IsCashless;
                    response.Record = recoUpdate;
                    await ctx.SaveChangesAsync();
                    response.Message = $"Hospital with HospitalId {entity.HospitalId} updated successfully.";
                    response.ResponseCode = 200;
                }
                else
                {
                    throw new Exception($"Hospital with HospitalId {entity.HospitalId} does not exist.");
                }
            }
            catch (Exception ex) { throw ex; }
            return response;
        }

        public async Task<ResponseObject<Hospital>> DeleteAsync(int id)
        {
            ResponseObject<Hospital> response = new();
            try
            {
                var recoToDelete = await ctx.Hospitals.FindAsync(id);
                if (recoToDelete != null)
                {
                    response.Record = recoToDelete;
                    ctx.Hospitals.Remove(recoToDelete);
                    await ctx.SaveChangesAsync();
                    response.Message = $"Hospital with HospitalId {id} deleted successfully.";
                    response.ResponseCode = 200;
                }
                else
                {
                    throw new Exception($"Hospital with HospitalId {id} does not exist.");
                }
            }
            catch (Exception ex) { throw ex; }
            return response;
        }
    }
}
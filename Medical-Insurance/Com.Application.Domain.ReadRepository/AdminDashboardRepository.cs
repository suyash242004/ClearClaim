using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;

namespace Com.Application.Domain.ReadRepository
{
    public class AdminDashboardRepository : IAdminDashboardContract
    {
        IAdminDashboardDataAccess dataAccess;

        public AdminDashboardRepository(IAdminDashboardDataAccess dataAccess)
        {
            this.dataAccess = dataAccess;
        }

        public async Task<ResponseObject<Customer>> SearchCustomersAsync(string? city, string? profession, string? bloodGroup, string? disease)
        {
            ResponseObject<Customer> response = new();
            try
            {
                if (city == null && profession == null && bloodGroup == null && disease == null)
                    throw new Exception("Please provide at least one search filter.");

                response = await dataAccess.SearchCustomersAsync(city, profession, bloodGroup, disease);
            }
            catch (Exception ex)
            {
                throw new Exception(
                    ex.InnerException?.InnerException?.Message ??
                    ex.InnerException?.Message ??
                    ex.Message
                );
            }
            return response;
        }

        public async Task<ResponseObject<DashboardStats>> GetDashboardStatsAsync()
        {
            ResponseObject<DashboardStats> response = new();
            try
            {
                response = await dataAccess.GetDashboardStatsAsync();
            }
            catch (Exception ex)
            {
                throw new Exception(
                    ex.InnerException?.InnerException?.Message ??
                    ex.InnerException?.Message ??
                    ex.Message
                );
            }
            return response;
        }
    }
}
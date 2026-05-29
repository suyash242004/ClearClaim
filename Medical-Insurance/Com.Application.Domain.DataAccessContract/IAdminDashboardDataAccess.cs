using Com.Application.Domain.Entities;

namespace Com.Application.Domain.DataAccessContract
{
    public interface IAdminDashboardDataAccess
    {
        Task<ResponseObject<Customer>> SearchCustomersAsync(string? city, string? profession, string? bloodGroup, string? disease);
        Task<ResponseObject<DashboardStats>> GetDashboardStatsAsync();
    }
}
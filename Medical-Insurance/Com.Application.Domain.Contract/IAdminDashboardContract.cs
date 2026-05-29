using Com.Application.Domain.Entities;

namespace Com.Application.Domain.Contract
{
    public interface IAdminDashboardContract
    {
        Task<ResponseObject<Customer>> SearchCustomersAsync(string? city, string? profession, string? bloodGroup, string? disease);
        Task<ResponseObject<DashboardStats>> GetDashboardStatsAsync();
    }
}
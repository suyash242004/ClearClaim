using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Com.Application.Domain.WriteDataAccess.Models;
using Microsoft.EntityFrameworkCore;

namespace Com.Application.Domain.WriteDataAccess
{
    public class PolicyPurchaseDataAccess : IPolicyPurchaseDataAccess
    {
        MedicalInsuranceContext ctx;

        public PolicyPurchaseDataAccess(MedicalInsuranceContext ctx)
        {
            this.ctx = ctx;
        }

        public async Task<ResponseObject<Policy>> PurchasePolicyAsync(int customerId, int planId, DateOnly startDate)
        {
            ResponseObject<Policy> response = new();
            try
            {
                // 1. Check customer exists
                var customer = await ctx.Customers.FindAsync(customerId);
                if (customer == null)
                    throw new Exception($"Customer with ID {customerId} does not exist.");

                // 2. Check plan exists
                var plan = await ctx.Insuranceplans.FindAsync(planId);
                if (plan == null)
                    throw new Exception($"Insurance Plan with ID {planId} does not exist.");

                // 3. Check customer doesn't already have active policy for same plan
                var existingPolicy = await ctx.Policys
                    .Where(p => p.CustomerId == customerId
                             && p.PlanId == planId
                             && p.IsActive == true)
                    .FirstOrDefaultAsync();

                if (existingPolicy != null)
                    throw new Exception($"Customer already has an active policy for this plan.");

                // 4. Auto calculate end date based on plan duration
                var endDate = startDate.AddYears(plan.PolicyDuration ?? 1);

                // 5. Create new policy
                var newPolicy = new Policy
                {
                    CustomerId = customerId,
                    PlanId = planId,
                    StartDate = startDate,
                    EndDate = endDate,
                    IsActive = true,
                    RenewalCount = 0
                };

                var result = await ctx.Policys.AddAsync(newPolicy);
                await ctx.SaveChangesAsync();

                response.Record = result.Entity;
                response.Message = $"Policy purchased successfully. Valid from {startDate} to {endDate}.";
                response.ResponseCode = 200;
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
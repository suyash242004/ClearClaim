using Com.Application.Domain.Entities;
using FluentValidation;

namespace Com.Application.Domain.WriteAPI.Validators
{
    public class PolicyValidator : AbstractValidator<Policy>
    {
        public PolicyValidator()
        {
            RuleFor(p => p.CustomerId)
                .GreaterThan(0).WithMessage("Customer ID must be greater than zero.");

            RuleFor(p => p.PlanId)
                .GreaterThan(0).WithMessage("Plan ID must be greater than zero.");

            RuleFor(p => p.StartDate)
                .NotEmpty().WithMessage("Start date is required.");

            RuleFor(p => p.EndDate)
                .NotEmpty().WithMessage("End date is required.")
                .Must((policy, endDate) => endDate > policy.StartDate)
                .WithMessage("End date must be after start date.");

            RuleFor(p => p.RenewalCount)
                .GreaterThanOrEqualTo(0).WithMessage("Renewal count cannot be negative.")
                .When(p => p.RenewalCount.HasValue);
        }
    }
}
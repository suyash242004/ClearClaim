using Com.Application.Domain.Entities;
using FluentValidation;

namespace Com.Application.Domain.WriteAPI.Validators
{
    public class InsuranceplanValidator : AbstractValidator<Insuranceplan>
    {
        public InsuranceplanValidator()
        {
            RuleFor(p => p.PlanName)
                .NotEmpty().WithMessage("Plan name is required.")
                .MaximumLength(100).WithMessage("Plan name must not exceed 100 characters.");

            RuleFor(p => p.PremiumAmount)
                .GreaterThan(0).WithMessage("Premium amount must be greater than zero.");

            RuleFor(p => p.CoverageAmount)
                .GreaterThan(0).WithMessage("Coverage amount must be greater than zero.")
                .GreaterThan(p => p.PremiumAmount).WithMessage("Coverage amount must be greater than premium amount.");

            RuleFor(p => p.MaxMembers)
                .GreaterThan(0).WithMessage("Max members must be greater than zero.");

            RuleFor(p => p.PolicyDuration)
                .GreaterThan(0).WithMessage("Policy duration must be greater than zero.")
                .When(p => p.PolicyDuration.HasValue);
        }
    }
}
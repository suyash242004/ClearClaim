
using Com.Application.Domain.Entities;
using FluentValidation;
namespace Com.Application.Domain.WriteAPI.Validators
{
    // ABstractValidator is a class from the FluentValidation library that provides a base implementation for creating validators.
    //Use RuleFor method to define validation rules for each property of the Claim class.
    //For example, you can specify that the ClaimAmount must be greater than zero.
    public class ClaimValidator : AbstractValidator<Claim>
    {
        public ClaimValidator()
        {


            RuleFor(c => c.PolicyId)
                .GreaterThan(0).WithMessage("Policy ID must be greater than zero.");

            RuleFor(c => c.HospitalId)
                .GreaterThan(0).WithMessage("Hospital ID must be greater than zero.");

            RuleFor(c => c.ClaimAmount)
                .GreaterThan(0).WithMessage("Claim amount must be greater than zero.");

            RuleFor(c => c.ClaimDate)
                .NotEmpty().WithMessage("Claim date is required.")
                .Must(BeNotFutureDate).WithMessage("Claim date cannot be a future date.");

            RuleFor(c => c.Disease)
                .MaximumLength(100).WithMessage("Disease must not exceed 100 characters.")
                .When(c => c.Disease != null);

            RuleFor(c => c.DoctorName)
                .MaximumLength(100).WithMessage("Doctor name must not exceed 100 characters.")
                .When(c => c.DoctorName != null);

            RuleFor(c => c.Status)
                .Must(BeValidStatus).WithMessage("Status must be Pending, Approved or Rejected.")
                .When(c => c.Status != null);
        }

        private bool BeNotFutureDate(DateOnly date)
        {
            return date <= DateOnly.FromDateTime(DateTime.Today);
        }

        private bool BeValidStatus(string? status)
        {
            var valid = new[] { "Pending", "Approved", "Rejected" };
            return valid.Contains(status);
        }
    }
}

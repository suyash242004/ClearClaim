using Com.Application.Domain.Entities;
using FluentValidation;

namespace Com.Application.Domain.WriteAPI.Validators
{
    public class HospitalValidator : AbstractValidator<Hospital>
    {
        public HospitalValidator()
        {
            RuleFor(h => h.HospitalName)
                .NotEmpty().WithMessage("Hospital name is required.")
                .MaximumLength(150).WithMessage("Hospital name must not exceed 150 characters.");

            RuleFor(h => h.City)
                .NotEmpty().WithMessage("City is required.")
                .MaximumLength(50).WithMessage("City must not exceed 50 characters.");
        }
    }
}
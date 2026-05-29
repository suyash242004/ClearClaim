using Com.Application.Domain.Entities;
using FluentValidation;

namespace Com.Application.Domain.WriteAPI.Validators
{
    public class CustomerValidator : AbstractValidator<Customer>
    {
        public CustomerValidator()
        {
            RuleFor(c => c.CustomerName)
                .NotEmpty().WithMessage("Customer name is required.")
                .MaximumLength(100).WithMessage("Customer name must not exceed 100 characters.");

            RuleFor(c => c.CustomerEmail)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("Invalid email format.")
                .MaximumLength(150).WithMessage("Email must not exceed 150 characters.");

            RuleFor(c => c.CustomerPhone)
                .NotEmpty().WithMessage("Phone number is required.")
                .MaximumLength(15).WithMessage("Phone number must not exceed 15 characters.")
                .Matches(@"^\d+$").WithMessage("Phone number must contain digits only.");

            RuleFor(c => c.Gender)
                .Must(g => g == null || g == "Male" || g == "Female" || g == "Other")
                .WithMessage("Gender must be Male, Female or Other.");

            RuleFor(c => c.Age)
                .GreaterThan(0).WithMessage("Age must be greater than 0.")
                .LessThan(150).WithMessage("Age must be less than 150.")
                .When(c => c.Age.HasValue);

            RuleFor(c => c.City)
                .MaximumLength(50).WithMessage("City must not exceed 50 characters.")
                .When(c => c.City != null);

            RuleFor(c => c.Profession)
                .MaximumLength(50).WithMessage("Profession must not exceed 50 characters.")
                .When(c => c.Profession != null);

            RuleFor(c => c.BloodGroup)
                .MaximumLength(5).WithMessage("Blood group must not exceed 5 characters.")
                .Must(BeValidBloodGroup).WithMessage("Invalid blood group. Valid values: A+ve, A-ve, B+ve, B-ve, O+ve, O-ve, AB+ve, AB-ve.")
                .When(c => c.BloodGroup != null);
        }

        private bool BeValidBloodGroup(string? bloodGroup)
        {
            var valid = new[] { "A+ve", "A-ve", "B+ve", "B-ve", "O+ve", "O-ve", "AB+ve", "AB-ve" };
            return valid.Contains(bloodGroup);
        }
    }
}
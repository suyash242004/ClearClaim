using Com.Application.Domain.Entities;
using FluentValidation;

namespace Com.Application.Domain.WriteAPI.Validators
{
    public class FamilymemberValidator : AbstractValidator<Familymember>
    {
        public FamilymemberValidator()
        {
            RuleFor(f => f.PolicyId)
                .GreaterThan(0).WithMessage("Policy ID must be greater than zero.");

            RuleFor(f => f.MemberName)
                .NotEmpty().WithMessage("Member name is required.")
                .MaximumLength(100).WithMessage("Member name must not exceed 100 characters.");

            RuleFor(f => f.Relation)
                .NotEmpty().WithMessage("Relation is required.")
                .Must(BeValidRelation).WithMessage("Invalid relation. Valid values: Wife, Husband, Son, Daughter, Father, Mother.");

            RuleFor(f => f.Age)
                .GreaterThan(0).WithMessage("Age must be greater than zero.")
                .LessThan(150).WithMessage("Age must be less than 150.")
                .When(f => f.Age.HasValue);

            RuleFor(f => f.Gender)
                .Must(g => g == null || g == "Male" || g == "Female" || g == "Other")
                .WithMessage("Gender must be Male, Female or Other.")
                .When(f => f.Gender != null);
        }

        private bool BeValidRelation(string relation)
        {
            var valid = new[] { "Wife", "Husband", "Son", "Daughter", "Father", "Mother" };
            return valid.Contains(relation);
        }
    }
}
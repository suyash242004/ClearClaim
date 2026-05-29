using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Com.Application.Domain.Entities;

public partial class Policy : BaseEntity
{
    public int PolicyId { get; set; }

    public int CustomerId { get; set; }

    public int PlanId { get; set; }
    // Dateonly(2026-05-16) -> DateTime (2026-05-16 11:45:30)
    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    //public string StartDate { get; set; } = string.Empty;

    //public string EndDate { get; set; } = string.Empty;

    public bool? IsActive { get; set; }

    public int? RenewalCount { get; set; }

    [JsonIgnore]
    public virtual ICollection<Claim> Claims { get; set; } = new List<Claim>();

    //public virtual Customer Customer { get; set; } = null!;
    [JsonIgnore]
    public virtual Customer? Customer { get; set; }

    [JsonIgnore]
    public virtual ICollection<Familymember> Familymembers { get; set; } = new List<Familymember>();

    //public virtual Insuranceplan Plan { get; set; } = null!;
    [JsonIgnore]
    public virtual Insuranceplan? Plan { get; set; } 

}

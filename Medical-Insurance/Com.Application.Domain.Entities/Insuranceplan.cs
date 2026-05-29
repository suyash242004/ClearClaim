using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Com.Application.Domain.Entities;

public partial class Insuranceplan : BaseEntity
{
    public int PlanId { get; set; }

    public string PlanName { get; set; } = null!;

    public decimal PremiumAmount { get; set; }

    public decimal CoverageAmount { get; set; }

    public int MaxMembers { get; set; }

    public int? PolicyDuration { get; set; }
    [JsonIgnore]
    public virtual ICollection<Policy> Policies { get; set; } = new List<Policy>();
    [JsonIgnore]
    public virtual ICollection<Hospital> Hospitals { get; set; } = new List<Hospital>();
}

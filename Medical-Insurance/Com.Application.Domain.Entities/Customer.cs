using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Com.Application.Domain.Entities;

public partial class Customer : BaseEntity
{
    public int CustomerId { get; set; }

    public string CustomerName { get; set; } = null!;

    public string CustomerEmail { get; set; } = null!;

    public string CustomerPhone { get; set; } = null!;

    public string? Gender { get; set; }

    public int? Age { get; set; }

    public string? City { get; set; }

    public string? Profession { get; set; }

    public string? BloodGroup { get; set; }

    public string? HistoricalDisease { get; set; }

    public string? Password { get; set; }

    public decimal? RiskScore { get; set; }

    [JsonIgnore]
    public virtual ICollection<Policy> Policies { get; set; } = new List<Policy>();
}

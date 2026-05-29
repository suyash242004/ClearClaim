using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Com.Application.Domain.Entities;

public partial class Claim : BaseEntity
{
    public int ClaimId { get; set; }

    public int PolicyId { get; set; }

    public int HospitalId { get; set; }

    // DateOnly -> DateTime
    public DateOnly ClaimDate { get; set; }
    //public string ClaimDate { get; set; } = string.Empty;

    public decimal ClaimAmount { get; set; }

    public string? Disease { get; set; }

    public string? Status { get; set; }

    public string? DoctorName { get; set; }

    public string? Description { get; set; }

    //public virtual Hospital Hospital { get; set; } = null!;
    [JsonIgnore]
    public virtual Hospital? Hospital { get; set; }


    //public virtual Policy Policy { get; set; } = null!;
    [JsonIgnore]
    public virtual Policy? Policy { get; set; } 

}

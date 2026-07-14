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

    // AI Agent output fields — populated by Python claim_processor agent
    public string? AiDecision { get; set; }      // 'Approve' | 'Reject' | 'Flag'

    public string? AiReasoning { get; set; }     // Full AI explanation text

    public decimal? AiConfidence { get; set; }   // 0.00 to 1.00

    public int? FraudScore { get; set; }         // 0-100 risk score

    public string? TxHash { get; set; }          // X Layer blockchain tx hash

    //public virtual Hospital Hospital { get; set; } = null!;
    [JsonIgnore]
    public virtual Hospital? Hospital { get; set; }


    //public virtual Policy Policy { get; set; } = null!;
    [JsonIgnore]
    public virtual Policy? Policy { get; set; } 

}

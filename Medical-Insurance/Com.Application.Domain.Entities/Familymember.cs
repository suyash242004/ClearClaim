using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Com.Application.Domain.Entities;

public partial class Familymember : BaseEntity
{
    public int MemberId { get; set; }

    public int PolicyId { get; set; }

    public string MemberName { get; set; } = null!;

    public string Relation { get; set; } = null!;

    public int? Age { get; set; }

    public string? Gender { get; set; }

    //public virtual Policy Policy { get; set; } = null!;
    [JsonIgnore]
    public virtual Policy? Policy { get; set; } 

}

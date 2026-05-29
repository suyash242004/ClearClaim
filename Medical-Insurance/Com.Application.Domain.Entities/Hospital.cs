//using Microsoft.EntityFrameworkCore;
//using Microsoft.EntityFrameworkCore.Metadata.Internal;
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Com.Application.Domain.Entities;

public partial class Hospital : BaseEntity
{
    public int HospitalId { get; set; }

    public string HospitalName { get; set; } = null!;

    public string City { get; set; } = null!;

    public bool IsCashless { get; set; }
    [JsonIgnore]
    public virtual ICollection<Claim> Claims { get; set; } = new List<Claim>();
    [JsonIgnore]
    public virtual ICollection<Insuranceplan> Plans { get; set; } = new List<Insuranceplan>();
}



//Plan hospital class is not generated 
// PlanHospital is a pure junction table
//composite primary key
//only foreign keys
//EF Core is internally managing the PlanHospital junction table automatically.
using System;
using System.Collections.Generic;
using Com.Application.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Com.Application.Domain.WriteDataAccess.Models;

public partial class MedicalInsuranceContext : DbContext
{
    public MedicalInsuranceContext()
    {
    }

    public MedicalInsuranceContext(DbContextOptions<MedicalInsuranceContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Claim> Claims { get; set; }

    public virtual DbSet<Customer> Customers { get; set; }

    public virtual DbSet<Familymember> Familymembers { get; set; }

    public virtual DbSet<Hospital> Hospitals { get; set; }

    public virtual DbSet<Insuranceplan> Insuranceplans { get; set; }

    public virtual DbSet<Policy> Policys { get; set; }

//    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
////#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
//        => optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=medical_insurance;Username=postgres;Password=Suy@sh007");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresEnum("claim_status", new[] { "Pending", "Approved", "Rejected" });

        modelBuilder.Entity<Claim>(entity =>
        {
            entity.HasKey(e => e.ClaimId).HasName("claims_pkey");

            entity.ToTable("claims");

            entity.Property(e => e.ClaimId).HasColumnName("claim_id");
            entity.Property(e => e.ClaimAmount)
                .HasPrecision(10, 2)
                .HasColumnName("claim_amount");
            entity.Property(e => e.ClaimDate).HasColumnName("claim_date");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Disease)
                .HasMaxLength(100)
                .HasColumnName("disease");
            entity.Property(e => e.DoctorName)
                .HasMaxLength(100)
                .HasColumnName("doctor_name");
            entity.Property(e => e.HospitalId).HasColumnName("hospital_id");
            entity.Property(e => e.PolicyId).HasColumnName("policy_id");
            entity.Property(e => e.Status)
                  .HasMaxLength(20)
                  .HasColumnName("status");
            entity.HasOne(d => d.Hospital).WithMany(p => p.Claims)
                .HasForeignKey(d => d.HospitalId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_claim_hospital");

            entity.HasOne(d => d.Policy).WithMany(p => p.Claims)
                .HasForeignKey(d => d.PolicyId)
                .HasConstraintName("fk_claim_policy");
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.CustomerId).HasName("customer_pkey");

            entity.ToTable("customer");

            entity.HasIndex(e => e.CustomerEmail, "customer_customer_email_key").IsUnique();

            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.Age).HasColumnName("age");
            entity.Property(e => e.BloodGroup)
                .HasMaxLength(5)
                .HasColumnName("blood_group");
            entity.Property(e => e.City)
                .HasMaxLength(50)
                .HasColumnName("city");
            entity.Property(e => e.CustomerEmail)
                .HasMaxLength(150)
                .HasColumnName("customer_email");
            entity.Property(e => e.CustomerName)
                .HasMaxLength(100)
                .HasColumnName("customer_name");
            entity.Property(e => e.CustomerPhone)
                .HasMaxLength(15)
                .HasColumnName("customer_phone");
            entity.Property(e => e.Gender)
                .HasMaxLength(10)
                .HasColumnName("gender");
            entity.Property(e => e.HistoricalDisease).HasColumnName("historical_disease");
            entity.Property(e => e.Profession)
                .HasMaxLength(50)
                .HasColumnName("profession");
        });

        modelBuilder.Entity<Familymember>(entity =>
        {
            entity.HasKey(e => e.MemberId).HasName("familymember_pkey");

            entity.ToTable("familymember");

            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.Age).HasColumnName("age");
            entity.Property(e => e.Gender)
                .HasMaxLength(10)
                .HasColumnName("gender");
            entity.Property(e => e.MemberName)
                .HasMaxLength(100)
                .HasColumnName("member_name");
            entity.Property(e => e.PolicyId).HasColumnName("policy_id");
            entity.Property(e => e.Relation)
                .HasMaxLength(20)
                .HasColumnName("relation");

            entity.HasOne(d => d.Policy).WithMany(p => p.Familymembers)
                .HasForeignKey(d => d.PolicyId)
                .HasConstraintName("fk_familymember_policy");
        });

        modelBuilder.Entity<Hospital>(entity =>
        {
            entity.HasKey(e => e.HospitalId).HasName("hospital_pkey");

            entity.ToTable("hospital");

            entity.HasIndex(e => new { e.HospitalName, e.City }, "uq_hospital").IsUnique();

            entity.Property(e => e.HospitalId).HasColumnName("hospital_id");
            entity.Property(e => e.City)
                .HasMaxLength(50)
                .HasColumnName("city");
            entity.Property(e => e.HospitalName)
                .HasMaxLength(150)
                .HasColumnName("hospital_name");
            entity.Property(e => e.IsCashless)
                .HasDefaultValue(false)
                .HasColumnName("is_cashless");
        });

        modelBuilder.Entity<Insuranceplan>(entity =>
        {
            entity.HasKey(e => e.PlanId).HasName("insuranceplan_pkey");

            entity.ToTable("insuranceplan");

            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.CoverageAmount)
                .HasPrecision(12, 2)
                .HasColumnName("coverage_amount");
            entity.Property(e => e.MaxMembers).HasColumnName("max_members");
            entity.Property(e => e.PlanName)
                .HasMaxLength(100)
                .HasColumnName("plan_name");
            entity.Property(e => e.PolicyDuration)
                .HasDefaultValue(1)
                .HasColumnName("policy_duration");
            entity.Property(e => e.PremiumAmount)
                .HasPrecision(10, 2)
                .HasColumnName("premium_amount");

            entity.HasMany(d => d.Hospitals).WithMany(p => p.Plans)
                .UsingEntity<Dictionary<string, object>>(
                    "Planhospital",
                    r => r.HasOne<Hospital>().WithMany()
                        .HasForeignKey("HospitalId")
                        .HasConstraintName("fk_planhospital_hospital"),
                    l => l.HasOne<Insuranceplan>().WithMany()
                        .HasForeignKey("PlanId")
                        .HasConstraintName("fk_planhospital_plan"),
                    j =>
                    {
                        j.HasKey("PlanId", "HospitalId").HasName("planhospital_pkey");
                        j.ToTable("planhospital");
                        j.IndexerProperty<int>("PlanId").HasColumnName("plan_id");
                        j.IndexerProperty<int>("HospitalId").HasColumnName("hospital_id");
                    });
        });

        modelBuilder.Entity<Policy>(entity =>
        {
            entity.HasKey(e => e.PolicyId).HasName("policys_pkey");

            entity.ToTable("policys");

            entity.Property(e => e.PolicyId).HasColumnName("policy_id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.RenewalCount)
                .HasDefaultValue(0)
                .HasColumnName("renewal_count");
            entity.Property(e => e.StartDate).HasColumnName("start_date");

            entity.HasOne(d => d.Customer).WithMany(p => p.Policies)
                .HasForeignKey(d => d.CustomerId)
                .HasConstraintName("fk_policy_customer");

            entity.HasOne(d => d.Plan).WithMany(p => p.Policies)
                .HasForeignKey(d => d.PlanId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_policy_plan");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}

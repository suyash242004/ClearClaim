using Com.Application.Domain.Entities;
using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.WriteDataAccess.Models;
using Com.Application.Domain.WriteDataAccess;
using Com.Application.Domain.WriteRepository;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;
using Com.Application.Domain.WriteAPI.Validators;
using Com.Application.Domain.WriteAPI.CustomMiddleware;


var builder = WebApplication.CreateBuilder(args);

// Allow React frontend running on Vite default port to access Write APIs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});


// Register the DbContext with the connection string from appsettings.json
builder.Services.AddDbContext<MedicalInsuranceContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("AppConn")));

// Add services to the container.
// Register DataAccess and Repository classes in the Dependency container

// DataAccess registrations
builder.Services.AddScoped<IWriteDataAccess<Customer, int>, CustomerWriteDataAccess>();
builder.Services.AddScoped<IWriteDataAccess<Claim, int>, ClaimWriteDataAccess>();
builder.Services.AddScoped<IWriteDataAccess<Policy, int>, PolicyWriteDataAccess>();
builder.Services.AddScoped<IWriteDataAccess<Hospital, int>, HospitalWriteDataAccess>();
builder.Services.AddScoped<IWriteDataAccess<Insuranceplan, int>, InsuranceplanWriteDataAccess>();
builder.Services.AddScoped<IWriteDataAccess<Familymember, int>, FamilymemberWriteDataAccess>();
// Business Logic Layer registrations
builder.Services.AddScoped<IPolicyPurchaseDataAccess, PolicyPurchaseDataAccess>();
builder.Services.AddScoped<IClaimSubmitDataAccess, ClaimSubmitDataAccess>();
builder.Services.AddScoped<IAdminClaimDataAccess, AdminClaimWriteDataAccess>();


// Repository registrations
builder.Services.AddScoped<IWriteContract<Customer, int>, CustomerWriteRepository>();
builder.Services.AddScoped<IWriteContract<Claim, int>, ClaimWriteRepository>();
builder.Services.AddScoped<IWriteContract<Policy, int>, PolicyWriteRepository>();
builder.Services.AddScoped<IWriteContract<Hospital, int>, HospitalWriteRepository>();
builder.Services.AddScoped<IWriteContract<Insuranceplan, int>, InsuranceplanWriteRepository>();
builder.Services.AddScoped<IWriteContract<Familymember, int>, FamilymemberWriteRepository>();
// Business Logic Layer registrations
builder.Services.AddScoped<IPolicyPurchaseContract, PolicyPurchaseRepository>();
builder.Services.AddScoped<IClaimSubmitContract, ClaimSubmitRepository>();
builder.Services.AddScoped<IAdminClaimContract, AdminClaimWriteRepository>();



builder.Services.AddControllers();

// Register the Validator Service
// there is default validator we need to supress it because we have our own custom validator

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    // suppressModelStateInvalidFilter is used to suppress the default model state validation filter in ASP.NET Core.
    // By setting this property to true, you can prevent the framework from automatically returning a 400 Bad Request response when the model state is invalid.
    // This allows you to implement your own custom validation logic and return more specific error responses if needed.
    options.SuppressModelStateInvalidFilter = true;
});

builder.Services.AddScoped<IValidator<Customer>, CustomerValidator>();
builder.Services.AddScoped<IValidator<Claim>, ClaimValidator>();
builder.Services.AddScoped<IValidator<Policy>, PolicyValidator>();
builder.Services.AddScoped<IValidator<Hospital>, HospitalValidator>();
builder.Services.AddScoped<IValidator<Insuranceplan>, InsuranceplanValidator>();
builder.Services.AddScoped<IValidator<Familymember>, FamilymemberValidator>();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Apply CORS policy before authorization and controller mapping
app.UseCors("AllowReactApp");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//app.UseHttpsRedirection();

app.UseAuthorization();

// Add the custom middleware to the pipeline
// it is at global level so it will catch any exception that occurs in the application
app.UseCustomException();

app.MapControllers();

app.Run();

using Com.Application.Domain.Contract;
using Com.Application.Domain.DataAccessContract;
using Com.Application.Domain.Entities;
using Com.Application.Domain.ReadDataAccess;
using Com.Application.Domain.ReadRepository;
using Com.Application.Domain.WriteAPI.CustomMiddleware;
//using Dapper;
//using Microsoft.EntityFrameworkCore;

// Enables automatic mapping between snake_case database columns and PascalCase C# properties
// Example: customer_id (snake_case) → CustomerId (PascalCase)
Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true); // database colunms are date not timestamp


var builder = WebApplication.CreateBuilder(args);


////CORS Policy : It means Cross-Origin Resource Sharing. In simple terms means allowing resources (APIs) from one domain (backend) to be accessed by another domain (frontend).
//→ Only requests coming from http://localhost:5173 (React app)
//→ Allow any HTTP method (GET, POST, PUT, DELETE)
// Allow React frontend running on Vite default port to access Read APIs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Add services to the container.
// Register DataAccess and Repository classes in the Dependency container
// Since, Repository is dependant on DataAccess, we need to register DataAccess first and then Repository.

// DataAccess registrations
builder.Services.AddScoped<IReadDataAccess<Customer, int>, CustomerReadDataAccess>();
builder.Services.AddScoped<IReadDataAccess<Claim, int>, ClaimReadDataAccess>();
builder.Services.AddScoped<IReadDataAccess<Policy, int>, PolicyReadDataAccess>();
builder.Services.AddScoped<IReadDataAccess<Hospital, int>, HospitalReadDataAccess>();
builder.Services.AddScoped<IReadDataAccess<Insuranceplan, int>, InsuranceplanReadDataAccess>();
builder.Services.AddScoped<IReadDataAccess<Familymember, int>, FamilymemberReadDataAccess>();
// Business logic DataAccess registrations
builder.Services.AddScoped<IPlanDataAccess, PlanSearchDataAccess>();
builder.Services.AddScoped<IAdminClaimDataAccess, AdminClaimReadDataAccess>();
builder.Services.AddScoped<IAdminDashboardDataAccess, AdminDashboardDataAccess>();
builder.Services.AddScoped<ICustomerTrackingDataAccess, CustomerTrackingDataAccess>();
builder.Services.AddScoped<IHospitalDataAccess, HospitalDataAccess>();

// Repository registrations
builder.Services.AddScoped<IReadContract<Customer, int>, CustomerReadRepository>();
builder.Services.AddScoped<IReadContract<Claim, int>, ClaimReadRepository>();
builder.Services.AddScoped<IReadContract<Policy, int>, PolicyReadRepository>();
builder.Services.AddScoped<IReadContract<Hospital, int>, HospitalReadRepository>();
builder.Services.AddScoped<IReadContract<Insuranceplan, int>, InsuranceplanReadRepository>();
builder.Services.AddScoped<IReadContract<Familymember, int>, FamilymemberReadRepository>();
// Business logic Repository registrations
builder.Services.AddScoped<IPlanContract, PlanSearchRepository>();
builder.Services.AddScoped<IAdminClaimContract, AdminClaimReadRepository>();
builder.Services.AddScoped<IAdminDashboardContract, AdminDashboardRepository>();
builder.Services.AddScoped<ICustomerTrackingContract, CustomerTrackingRepository>();
builder.Services.AddScoped<IHospitalContract, HospitalRepository>();



// put breakpoint to view services in dependency Container...click on services...view...IRead
builder.Services.AddControllers();


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

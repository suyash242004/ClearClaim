namespace Com.Application.Domain.WriteAPI.CustomMiddleware
{
    // record type is a reference type that provides built-in functionality for encapsulating data.
    // It is immutable by default, meaning that once an instance of a record is created
    // its properties cannot be modified. This makes records ideal for representing data that should not change after it has been created, such as error information in this case.
    public record ErrorInformation { 
      public int StatusCode { get; set;}
      public string? ErrorMessage { get; set; }

     //public string? RequestedUrl { get; set; }
    }
    public record ExceptionMiddleware
    {
        // request delegate is a function that can process an HTTP request and produce an HTTP response.
        private RequestDelegate _next;

        public ExceptionMiddleware(RequestDelegate next)
        {
            _next = next;
        }
        // logic method that will be executed when an exception occurs during the processing of an HTTP request.
        public async Task InvokeAsync(HttpContext ctx)
        {
            try
            {
            // if there is no error then move to the next middleware in the pipeline by calling the next delegate.
                await _next(ctx);
            }
            catch (Exception ex)
            {
                ctx.Response.ContentType = "application/json";
                // handle the exception and return error back to Response
                ctx.Response.StatusCode = 500;
                 ErrorInformation error = new ErrorInformation
                {
                    StatusCode = ctx.Response.StatusCode,
                    ErrorMessage = ex.Message,
                    //RequestedUrl = ctx.Request.Path
                };
                //Write the reponse
                await ctx.Response.WriteAsJsonAsync(error);
            }
        }
    }

    // Register the middleware using the extension method in Program.cs
    //extension method is a static method that allows you to add new functionality to an existing type without modifying
    //the original type or creating a new derived type.
    public static class ExceptionMiddlewareExtensions
    {
        public static void UseCustomException(this IApplicationBuilder builder)
        {
            builder.UseMiddleware<ExceptionMiddleware>();
        }
    }
}

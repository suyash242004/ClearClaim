
using Com.Application.Domain.Contract;
using Com.Application.Domain.Entities;
using Com.Application.Domain.DataAccessContract;

namespace Com.Application.Domain.ReadRepository
{
    public class CustomerReadRepository : IReadContract<Customer, int>
    {
        // Use the Depeendency Injection for the class that implements the IReadDataAccess interface (CustomerReadDataAccess) in the constructor of the class (CustomerReadRepository) that implements the IReadContract interface.
        // It allows us to decouple the class from the specific implementation of the dependency, making it easier to test and maintain.
        // like a container which will give me some Instance of that class with the help of interface.
        //decouple the class from the specific implementation of the dependency, making it easier to test and maintain.
        // loose coupling means that the class (CustomerReadRepository) is not tightly bound to a specific implementation of the dependency (CustomerReadDataAccess). Instead, it relies on an abstraction (IReadDataAccess) to interact with the dependency. This allows us to easily swap out the implementation of the dependency without affecting the class that uses it, making our code more flexible and easier to maintain.
        // so we are not creating an instance of CustomerReadDataAccess inside the CustomerReadRepository class, instead we are injecting it through the constructor. This way we can easily swap out the implementation of the CustomerReadDataAccess with another implementation if needed, without affecting the CustomerReadRepository class.
        
        IReadDataAccess<Customer,int> dataAccess;

        public CustomerReadRepository(IReadDataAccess<Customer,int> dataAccess)
        {
            this.dataAccess = dataAccess;
        }
        async Task<ResponseObject<Customer>> IReadContract<Customer, int>.GetAsync()
        {
            ResponseObject<Customer> response = new ResponseObject<Customer>();
            try
            {
                response = await dataAccess.ReadAsync();
            }
            catch (Exception ex)
            {

                throw ex;
            }
            return response;
        }

        async Task<ResponseObject<Customer>> IReadContract<Customer, int>.GetAsync(int id)
        {
            ResponseObject<Customer> response = new ResponseObject<Customer>();
            try
            {
                response = await dataAccess.ReadAsync(id);
            }
            catch (Exception ex)
            {

                throw ex;
            }
            return response;
        }
    }
}

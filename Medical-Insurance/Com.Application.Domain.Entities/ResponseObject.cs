using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Com.Application.Domain.Entities
{
    // TEntity is placeholder(stands for any class) name. Its stands for Type of entity. It holds specific datatype (User, Product, Order).
    // If we pass User, then TEntity will be replaced with User. If we pass Product, then TEntity will be replaced with Product.
    //generic class that can work with any type of entity that inherits from BaseEntity.
    //It allows us to create a response object that can hold a single record, multiple records, a message, and a response code, regardless of the specific type of entity we are working with.
    //It force TEntity to be class that inherits from BaseEntity
    
    public class ResponseObject<TEntity> where TEntity : BaseEntity
    {
        public IEnumerable<TEntity>? Records { get; set; }
        public TEntity? Record { get; set; }
        public string? Message { get; set; }
        public int ResponseCode { get; set; }
    }
}

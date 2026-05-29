using Com.Application.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Com.Application.Domain.DataAccessContract
{
    // This interface defines the contract for reading data from a data source.
    // It includes methods for retrieving all entities or a specific entity by its primary key.

    //TEntity is either base entity or derived class of base entity
    public interface IReadDataAccess<TEntity, in TPk> where TEntity : BaseEntity
    {
        Task<ResponseObject<TEntity>> ReadAsync();
        Task<ResponseObject<TEntity>> ReadAsync(TPk id);

    }
}

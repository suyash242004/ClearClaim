using Com.Application.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

// this tell C# that interface can only be used with classes that inherit from baseEntity

namespace Com.Application.Domain.Contract
{
    // TEntity is base entity or any class derived from base entity, Tpk is type of primary key the entity
    public interface IReadContract<TEntity, in Tpk> where TEntity: BaseEntity
    {
        Task<ResponseObject<TEntity>> GetAsync();
        Task<ResponseObject<TEntity>> GetAsync(Tpk id);
    }
}

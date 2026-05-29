using Com.Application.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Com.Application.Domain.DataAccessContract
{
    public interface IWriteDataAccess<TEntity, in TPk> where TEntity : BaseEntity
    {
        Task<ResponseObject<TEntity>> AddAsync(TEntity entity);
        Task<ResponseObject<TEntity>> UpdateAsync(TEntity entity);
        Task<ResponseObject<TEntity>> DeleteAsync(TPk id);


    }
}

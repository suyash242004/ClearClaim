// ResponseObject.ts
// This model matches the ResponseObject<TEntity> returned by all backend APIs
// Every API response is wrapped in this structure

export interface ResponseObject<T> {
  records: T[]; // List of records (used for GetAll)
  record: T | null; // Single record (used for GetById, Create, Update)
  message: string; // Success or error message from backend
  responseCode: number; // 200 = success
}

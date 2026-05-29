// CustomerHttpService.ts
// Handles all HTTP calls related to Customer entity
// CRUD operations use writeApi and readApi

import { readApi, writeApi } from "./axiosConfig";
import type { Customer } from "../models/Customer";
import type { ResponseObject } from "../models/ResponseObject";

const CustomerHttpService = {
  // GET all customers
  getAll: async (): Promise<ResponseObject<Customer>> => {
    const response = await readApi.get("/api/CustomerRead");
    return response.data;
  },

  // GET customer by id
  getById: async (id: number): Promise<ResponseObject<Customer>> => {
    const response = await readApi.get(`/api/CustomerRead/${id}`);
    return response.data;
  },

  // POST create new customer
  create: async (customer: Customer): Promise<ResponseObject<Customer>> => {
    const response = await writeApi.post("/api/CustomerWrite", customer);
    return response.data;
  },

  // PUT update existing customer
  update: async (
    id: number,
    customer: Customer,
  ): Promise<ResponseObject<Customer>> => {
    const response = await writeApi.put(`/api/CustomerWrite/${id}`, customer);
    return response.data;
  },

  // DELETE customer by id
  delete: async (id: number): Promise<ResponseObject<Customer>> => {
    const response = await writeApi.delete(`/api/CustomerWrite/${id}`);
    return response.data;
  },
};

export default CustomerHttpService;

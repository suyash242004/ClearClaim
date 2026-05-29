// PolicyHttpService.ts
// Handles all HTTP calls related to Policy entity
// Includes business operation — purchase policy

import { readApi, writeApi } from "./axiosConfig";
import type { Policy } from "../models/Policy";
import type { ResponseObject } from "../models/ResponseObject";

const PolicyHttpService = {
  getAll: async (): Promise<ResponseObject<Policy>> => {
    const response = await readApi.get("/api/PolicyRead");
    return response.data;
  },

  getById: async (id: number): Promise<ResponseObject<Policy>> => {
    const response = await readApi.get(`/api/PolicyRead/${id}`);
    return response.data;
  },

  // Business API — purchase a new policy
  purchase: async (
    customerId: number,
    planId: number,
    startDate: string,
  ): Promise<ResponseObject<Policy>> => {
    const response = await writeApi.post(
      `/api/policies/purchase?customerId=${customerId}&planId=${planId}&startDate=${startDate}`,
    );
    return response.data;
  },

  // GET all policies for a specific customer
  getByCustomer: async (
    customerId: number,
  ): Promise<ResponseObject<Policy>> => {
    const response = await readApi.get(`/api/customer/${customerId}/policies`);
    return response.data;
  },

  update: async (
    id: number,
    policy: Policy,
  ): Promise<ResponseObject<Policy>> => {
    const response = await writeApi.put(`/api/PolicyWrite/${id}`, policy);
    return response.data;
  },

  delete: async (id: number): Promise<ResponseObject<Policy>> => {
    const response = await writeApi.delete(`/api/PolicyWrite/${id}`);
    return response.data;
  },
};

export default PolicyHttpService;

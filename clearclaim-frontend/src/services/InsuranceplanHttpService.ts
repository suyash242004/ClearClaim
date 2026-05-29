// InsuranceplanHttpService.ts
// Handles all HTTP calls related to InsurancePlan entity
// CRUD operations

import { readApi, writeApi } from "./axiosConfig";
import type { Insuranceplan } from "../models/Insuranceplan";
import type { ResponseObject } from "../models/ResponseObject";

const InsuranceplanHttpService = {
  getAll: async (): Promise<ResponseObject<Insuranceplan>> => {
    const response = await readApi.get("/api/InsuranceplanRead");
    return response.data;
  },

  getById: async (id: number): Promise<ResponseObject<Insuranceplan>> => {
    const response = await readApi.get(`/api/InsuranceplanRead/${id}`);
    return response.data;
  },

  create: async (
    plan: Insuranceplan,
  ): Promise<ResponseObject<Insuranceplan>> => {
    const response = await writeApi.post("/api/InsuranceplanWrite", plan);
    return response.data;
  },

  update: async (
    id: number,
    plan: Insuranceplan,
  ): Promise<ResponseObject<Insuranceplan>> => {
    const response = await writeApi.put(`/api/InsuranceplanWrite/${id}`, plan);
    return response.data;
  },

  delete: async (id: number): Promise<ResponseObject<Insuranceplan>> => {
    const response = await writeApi.delete(`/api/InsuranceplanWrite/${id}`);
    return response.data;
  },
};

export default InsuranceplanHttpService;

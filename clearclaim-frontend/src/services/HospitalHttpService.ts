// HospitalHttpService.ts
// Handles all HTTP calls related to Hospital entity
// Includes business operation — get claims by hospital

import { readApi, writeApi } from "./axiosConfig";
import type { Hospital } from "../models/Hospital";
import type { ResponseObject } from "../models/ResponseObject";
import type { Claim } from "../models/Claim";

const HospitalHttpService = {
  getAll: async (): Promise<ResponseObject<Hospital>> => {
    const response = await readApi.get("/api/HospitalRead");
    return response.data;
  },

  getById: async (id: number): Promise<ResponseObject<Hospital>> => {
    const response = await readApi.get(`/api/HospitalRead/${id}`);
    return response.data;
  },

  create: async (hospital: Hospital): Promise<ResponseObject<Hospital>> => {
    const response = await writeApi.post("/api/HospitalWrite", hospital);
    return response.data;
  },

  update: async (
    id: number,
    hospital: Hospital,
  ): Promise<ResponseObject<Hospital>> => {
    const response = await writeApi.put(`/api/HospitalWrite/${id}`, hospital);
    return response.data;
  },

  delete: async (id: number): Promise<ResponseObject<Hospital>> => {
    const response = await writeApi.delete(`/api/HospitalWrite/${id}`);
    return response.data;
  },

  // Business API — get all claims for a specific hospital
  getClaims: async (hospitalId: number): Promise<ResponseObject<Claim>> => {
    const response = await readApi.get(`/api/hospital/${hospitalId}/claims`);
    return response.data;
  },

  // Business API — get claims by status for a hospital
  getClaimsByStatus: async (
    hospitalId: number,
    status: string,
  ): Promise<ResponseObject<Claim>> => {
    const response = await readApi.get(
      `/api/hospital/${hospitalId}/claims/${status}`,
    );
    return response.data;
  },
};

export default HospitalHttpService;

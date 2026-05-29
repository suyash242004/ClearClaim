// ClaimHttpService.ts
// Handles all HTTP calls related to Claim entity
// Includes business operations — submit claim, approve, reject

import { readApi, writeApi } from "./axiosConfig";
import type { Claim } from "../models/Claim";
import type { ResponseObject } from "../models/ResponseObject";

const ClaimHttpService = {
  getAll: async (): Promise<ResponseObject<Claim>> => {
    const response = await readApi.get("/api/ClaimRead");
    return response.data;
  },

  getById: async (id: number): Promise<ResponseObject<Claim>> => {
    const response = await readApi.get(`/api/ClaimRead/${id}`);
    return response.data;
  },

  // Business API — customer submits a new claim
  submit: async (
    policyId: number,
    hospitalId: number,
    claimAmount: number,
    disease: string,
    doctorName: string,
    description?: string,
  ): Promise<ResponseObject<Claim>> => {
    const params = new URLSearchParams({
      policyId: policyId.toString(),
      hospitalId: hospitalId.toString(),
      claimAmount: claimAmount.toString(),
      disease,
      doctorName,
      ...(description && { description }),
    });
    const response = await writeApi.post(`/api/claims/submit?${params}`);
    return response.data;
  },

  // Business API — get all claims for a specific customer
  getByCustomer: async (customerId: number): Promise<ResponseObject<Claim>> => {
    const response = await readApi.get(`/api/customer/${customerId}/claims`);
    return response.data;
  },

  // Business API — get all pending claims (admin)
  getPending: async (): Promise<ResponseObject<Claim>> => {
    const response = await readApi.get("/api/admin/claims/pending");
    return response.data;
  },

  // Business API — admin approves a claim
  approve: async (claimId: number): Promise<ResponseObject<Claim>> => {
    const response = await writeApi.put(`/api/admin/claims/approve/${claimId}`);
    return response.data;
  },

  // Business API — admin rejects a claim
  reject: async (claimId: number): Promise<ResponseObject<Claim>> => {
    const response = await writeApi.put(`/api/admin/claims/reject/${claimId}`);
    return response.data;
  },

  delete: async (id: number): Promise<ResponseObject<Claim>> => {
    const response = await writeApi.delete(`/api/ClaimWrite/${id}`);
    return response.data;
  },
};

export default ClaimHttpService;

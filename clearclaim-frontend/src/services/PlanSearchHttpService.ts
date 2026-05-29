// PlanSearchHttpService.ts
// Handles all HTTP calls related to Plan Search business operations
// Search plans, compare plans, get hospitals by plan

import { readApi } from "./axiosConfig";
import type { Insuranceplan } from "../models/Insuranceplan";
import type { Hospital } from "../models/Hospital";
import type { ResponseObject } from "../models/ResponseObject";

const PlanSearchHttpService = {
  // Business API — search plans with optional filters
  searchPlans: async (
    city?: string,
    maxPremium?: number,
    minCoverage?: number,
  ): Promise<ResponseObject<Insuranceplan>> => {
    const params = new URLSearchParams();
    if (city) params.append("city", city);
    if (maxPremium) params.append("maxPremium", maxPremium.toString());
    if (minCoverage) params.append("minCoverage", minCoverage.toString());
    const response = await readApi.get(`/api/plans/search?${params}`);
    return response.data;
  },

  // Business API — compare multiple plans
  comparePlans: async (
    planIds: number[],
  ): Promise<ResponseObject<Insuranceplan>> => {
    const params = planIds.map((id) => `planIds=${id}`).join("&");
    const response = await readApi.get(`/api/plans/compare?${params}`);
    return response.data;
  },

  // Business API — get hospitals covered under a plan
  getHospitalsByPlan: async (
    planId: number,
  ): Promise<ResponseObject<Hospital>> => {
    const response = await readApi.get(`/api/plans/${planId}/hospitals`);
    return response.data;
  },
};

export default PlanSearchHttpService;

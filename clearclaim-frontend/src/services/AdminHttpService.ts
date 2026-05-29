// AdminHttpService.ts
// Handles all HTTP calls related to Admin operations
// Dashboard stats and customer search

import { readApi } from "./axiosConfig";
import type { Customer } from "../models/Customer";
import type { DashboardStats } from "../models/DashboardStats";
import type { ResponseObject } from "../models/ResponseObject";

const AdminHttpService = {
  // Business API — get admin dashboard statistics
  getDashboardStats: async (): Promise<ResponseObject<DashboardStats>> => {
    const response = await readApi.get("/api/admin/dashboard");
    return response.data;
  },

  // Business API — search customers with optional filters
  searchCustomers: async (
    city?: string,
    profession?: string,
    bloodGroup?: string,
    disease?: string,
  ): Promise<ResponseObject<Customer>> => {
    const params = new URLSearchParams();
    if (city) params.append("city", city);
    if (profession) params.append("profession", profession);
    if (bloodGroup) params.append("bloodGroup", bloodGroup);
    if (disease) params.append("disease", disease);
    const response = await readApi.get(`/api/admin/customers/search?${params}`);
    return response.data;
  },
};

export default AdminHttpService;

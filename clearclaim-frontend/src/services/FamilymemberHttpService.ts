// FamilymemberHttpService.ts
// Handles all HTTP calls related to FamilyMember entity
// CRUD operations

import { readApi, writeApi } from "./axiosConfig";
import type { Familymember } from "../models/Familymember";
import type { ResponseObject } from "../models/ResponseObject";

const FamilymemberHttpService = {
  getAll: async (): Promise<ResponseObject<Familymember>> => {
    const response = await readApi.get("/api/FamilymemberRead");
    return response.data;
  },

  getById: async (id: number): Promise<ResponseObject<Familymember>> => {
    const response = await readApi.get(`/api/FamilymemberRead/${id}`);
    return response.data;
  },

  create: async (
    member: Familymember,
  ): Promise<ResponseObject<Familymember>> => {
    const response = await writeApi.post("/api/FamilymemberWrite", member);
    return response.data;
  },

  update: async (
    id: number,
    member: Familymember,
  ): Promise<ResponseObject<Familymember>> => {
    const response = await writeApi.put(`/api/FamilymemberWrite/${id}`, member);
    return response.data;
  },

  delete: async (id: number): Promise<ResponseObject<Familymember>> => {
    const response = await writeApi.delete(`/api/FamilymemberWrite/${id}`);
    return response.data;
  },
};

export default FamilymemberHttpService;

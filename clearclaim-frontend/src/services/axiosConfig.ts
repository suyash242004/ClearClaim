// axiosConfig.ts
// Central Axios configuration file
// Defines two separate Axios instances:
// 1. readApi  → connects to ReadAPI  (GET operations)
// 2. writeApi → connects to WriteAPI (POST, PUT, DELETE operations)

import axios from "axios";

// Axios instance for all READ operations (Dapper based APIs)
export const readApi = axios.create({
  baseURL: import.meta.env.VITE_READ_API_URL ?? "http://127.0.0.1:5234",
  headers: {
    "Content-Type": "application/json",
  },
});

// Axios instance for all WRITE operations (EF Core based APIs)
export const writeApi = axios.create({
  baseURL: import.meta.env.VITE_WRITE_API_URL ?? "http://127.0.0.1:5130",
  headers: {
    "Content-Type": "application/json",
  },
});

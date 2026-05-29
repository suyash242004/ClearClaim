// authSlice.ts
// This is the ONLY Redux slice in this app
// It stores WHO is currently logged in — role + id
// Role can be: 'customer' | 'admin' | 'hospital'
// This data is used across all pages to decide what to show

import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

// Define the shape of the auth state
interface AuthState {
  role: "customer" | "admin" | "hospital" | null; // current logged in role
  userId: number | null; // customerId or hospitalId
  isLoggedIn: boolean; // is user logged in
}

// Initial state — no one is logged in
const initialState: AuthState = {
  role: null,
  userId: null,
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Action: called when user logs in
    // Payload contains role and userId
    login(
      state,
      action: PayloadAction<{
        role: "customer" | "admin" | "hospital";
        userId: number | null;
      }>,
    ) {
      state.role = action.payload.role;
      state.userId = action.payload.userId;
      state.isLoggedIn = true;
    },

    // Action: called when user logs out
    // Resets everything back to initial state
    logout(state) {
      state.role = null;
      state.userId = null;
      state.isLoggedIn = false;
    },
  },
});

// Export actions to be used in components
export const { login, logout } = authSlice.actions;

// Export reducer to be registered in store
export default authSlice.reducer;

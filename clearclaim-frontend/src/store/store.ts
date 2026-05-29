// store.ts
// This is the Redux store — single source of truth for global state
// Currently only manages authentication state (who is logged in)
// All components can read from and dispatch to this store

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";

const store = configureStore({
  reducer: {
    // auth slice handles login/logout state
    auth: authReducer,
  },
});

// RootState type — used in useSelector to get typed state
export type RootState = ReturnType<typeof store.getState>;

// AppDispatch type — used in useDispatch for typed dispatch
export type AppDispatch = typeof store.dispatch;

export default store;

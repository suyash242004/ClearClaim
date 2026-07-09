// main.tsx
// Entry point of the React application
// Wraps the entire app with Redux Provider + PersistGate
// PersistGate delays rendering until redux-persist has rehydrated from localStorage
// This means page refresh = stay logged in (auth state survives)

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import store, { persistor } from "./store/store";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Provider makes Redux store available to all child components */}
    <Provider store={store}>
      {/* PersistGate holds render until localStorage state is loaded */}
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>,
);

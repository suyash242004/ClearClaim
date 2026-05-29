// main.tsx
// Entry point of the React application
// Wraps the entire app with Redux Provider so all components
// can access the global store (login state)

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import store from "./store/store";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Provider makes Redux store available to all child components */}
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);

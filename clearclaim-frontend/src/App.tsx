// function App() {
//   return (
//     <div className="min-h-screen bg-blue-700 flex items-center justify-center">
//       <h1 className="text-white text-4xl font-bold">ClearClaim</h1>
//     </div>
//   );
// }

// export default App;

// App.tsx
// Root component of ClearClaim application
// Sets up React Router with all page routes
// Protected routing based on Redux auth state (role)

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./store/store";
import Login from "./pages/Login";
import DbExplorer from "./pages/DbExplorer";

// Customer pages
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import BrowsePlans from "./pages/customer/BrowsePlans";
import PurchasePolicy from "./pages/customer/PurchasePolicy";
import MyPolicies from "./pages/customer/MyPolicies";
import SubmitClaim from "./pages/customer/SubmitClaim";
import MyClaims from "./pages/customer/MyClaims";
import FamilyMembers from "./pages/customer/FamilyMembers";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import PendingClaims from "./pages/admin/PendingClaims";
import CustomerSearch from "./pages/admin/CustomerSearch";
import ManageData from "./pages/admin/ManageData";

// Hospital pages
import HospitalClaims from "./pages/hospital/HospitalClaims";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

function App() {
  // Read current auth state from Redux store
  const { isLoggedIn, role } = useSelector((state: RootState) => state.auth);

  // If not logged in — show only Login page
  if (!isLoggedIn) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/db-explorer" element={<DbExplorer />} />
          {/* Any other URL after logout → redirect to Login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // If logged in — show layout with Navbar + Sidebar + Pages
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top navigation bar */}
        <Navbar />

        <div className="flex flex-1">
          {/* Side navigation bar */}
          <Sidebar />

          {/* Main content area */}
          <main className="flex-1 p-6">
            <Routes>
              {/* Customer Routes */}
              {role === "customer" && (
                <>
                  <Route path="/" element={<CustomerDashboard />} />
                  <Route path="/browse-plans" element={<BrowsePlans />} />
                  <Route path="/purchase-policy" element={<PurchasePolicy />} />
                  <Route path="/my-policies" element={<MyPolicies />} />
                  <Route path="/submit-claim" element={<SubmitClaim />} />
                  <Route path="/my-claims" element={<MyClaims />} />
                  <Route path="/family-members" element={<FamilyMembers />} />
                </>
              )}

              {/* Admin Routes */}
              {role === "admin" && (
                <>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/pending-claims" element={<PendingClaims />} />
                  <Route path="/customer-search" element={<CustomerSearch />} />
                  <Route path="/manage-data" element={<ManageData />} />
                </>
              )}

              {/* Hospital Routes */}
              {role === "hospital" && (
                <>
                  <Route path="/" element={<HospitalClaims />} />
                </>
              )}

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;

// App.tsx — BrowserRouter wraps everything so Login can call navigate()
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./store/store";
import { motion } from "framer-motion";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DemoCredentials from "./pages/DemoCredentials";
import Docs from "./pages/Docs";

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
import ReviewQueue from "./pages/admin/ReviewQueue";
import AgentEconomics from "./pages/admin/AgentEconomics";
import DbExplorer from "./pages/DbExplorer";

// Hospital pages
import HospitalDashboard from "./pages/hospital/HospitalDashboard";
import HospitalClaims from "./pages/hospital/HospitalClaims";
import HospitalPatientLookup from "./pages/hospital/HospitalPatientLookup";
import HospitalNetwork from "./pages/hospital/HospitalNetwork";

import Navbar from "./components/Navbar";
import ChatWidget from "./components/ChatWidget";

// Page wrapper with fade transition
const Page = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

function AppRoutes() {
  const { isLoggedIn, role } = useSelector((state: RootState) => state.auth);

  const isValidRole = role === "admin" || role === "customer" || role === "hospital";

  if (!isLoggedIn || !role || !isValidRole) {
    return (
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/demo" element={<DemoCredentials />} />
        <Route path="/" element={<Navigate to="/landing" replace />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#050810" }}>
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 overflow-auto">
        <Routes>
          {role === "customer" && (
            <>
              <Route path="/" element={<Page><CustomerDashboard /></Page>} />
              <Route path="/browse-plans" element={<Page><BrowsePlans /></Page>} />
              <Route path="/purchase-policy" element={<Page><PurchasePolicy /></Page>} />
              <Route path="/my-policies" element={<Page><MyPolicies /></Page>} />
              <Route path="/submit-claim" element={<Page><SubmitClaim /></Page>} />
              <Route path="/my-claims" element={<Page><MyClaims /></Page>} />
              <Route path="/family-members" element={<Page><FamilyMembers /></Page>} />
            </>
          )}
          {role === "admin" && (
            <>
              <Route path="/" element={<Page><AdminDashboard /></Page>} />
              <Route path="/pending-claims" element={<Page><PendingClaims /></Page>} />
              <Route path="/review-queue" element={<Page><ReviewQueue /></Page>} />
              <Route path="/economics" element={<Page><AgentEconomics /></Page>} />
              <Route path="/customer-search" element={<Page><CustomerSearch /></Page>} />
              <Route path="/db-explorer" element={<Page><DbExplorer /></Page>} />
            </>
          )}
          {role === "hospital" && (
            <>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Page><HospitalDashboard /></Page>} />
              <Route path="/claims" element={<Page><HospitalClaims /></Page>} />
              <Route path="/patients" element={<Page><HospitalPatientLookup /></Page>} />
              <Route path="/network" element={<Page><HospitalNetwork /></Page>} />
            </>
          )}
          <Route path="/docs" element={<Page><Docs /></Page>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <ChatWidget />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;

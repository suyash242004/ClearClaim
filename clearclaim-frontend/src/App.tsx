// App.tsx — BrowserRouter wraps everything so Login can call navigate()
// Pages are code-split with React.lazy so the initial bundle stays small.
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./store/store";
import { motion } from "framer-motion";
import { Brain } from "lucide-react";

// Public pages
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const DemoCredentials = lazy(() => import("./pages/DemoCredentials"));
const Docs = lazy(() => import("./pages/Docs"));

// Customer pages
const CustomerDashboard = lazy(() => import("./pages/customer/CustomerDashboard"));
const BrowsePlans = lazy(() => import("./pages/customer/BrowsePlans"));
const PurchasePolicy = lazy(() => import("./pages/customer/PurchasePolicy"));
const MyPolicies = lazy(() => import("./pages/customer/MyPolicies"));
const SubmitClaim = lazy(() => import("./pages/customer/SubmitClaim"));
const MyClaims = lazy(() => import("./pages/customer/MyClaims"));
const FamilyMembers = lazy(() => import("./pages/customer/FamilyMembers"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const PendingClaims = lazy(() => import("./pages/admin/PendingClaims"));
const CustomerSearch = lazy(() => import("./pages/admin/CustomerSearch"));
const ReviewQueue = lazy(() => import("./pages/admin/ReviewQueue"));
const AgentEconomics = lazy(() => import("./pages/admin/AgentEconomics"));
const DbExplorer = lazy(() => import("./pages/DbExplorer"));

// Hospital pages
const HospitalDashboard = lazy(() => import("./pages/hospital/HospitalDashboard"));
const HospitalClaims = lazy(() => import("./pages/hospital/HospitalClaims"));
const HospitalPatientLookup = lazy(() => import("./pages/hospital/HospitalPatientLookup"));
const HospitalNetwork = lazy(() => import("./pages/hospital/HospitalNetwork"));

import Navbar from "./components/Navbar";
import ChatWidget from "./components/ChatWidget";

// Branded loading fallback — shown while a lazy page chunk downloads.
// min-height keeps the layout from jumping when the page arrives.
const PageLoader = ({ fullScreen = false }: { fullScreen?: boolean }) => (
  <div
    className={`flex flex-col items-center justify-center gap-4 ${fullScreen ? "min-h-screen" : "min-h-[60vh]"}`}
    style={fullScreen ? { background: "#050810" } : undefined}
  >
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center animate-pulse"
      style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}
    >
      <Brain size={20} color="#6366F1" />
    </div>
    <span className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
    <p className="text-xs font-medium tracking-wide" style={{ color: "#475569" }}>
      Loading ClearClaim…
    </p>
  </div>
);

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
      <Suspense fallback={<PageLoader fullScreen />}>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/demo" element={<DemoCredentials />} />
          <Route path="/" element={<Navigate to="/landing" replace />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#050810" }}>
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 overflow-auto">
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
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

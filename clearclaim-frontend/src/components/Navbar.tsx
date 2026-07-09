// Navbar.tsx — Upgraded with Ghast/Anima aesthetic
// Indigo accent, ring-pulse AI badge, gradient bottom border, underline active links
// ALL existing logic (wallet connect, role links, logout) preserved exactly.

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { logout } from "../store/authSlice";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, LogOut, Wallet, FileText, Menu, X,
  LayoutDashboard, ClipboardList, Search, Settings,
  ShieldCheck, HeartPulse, Users, Building2
} from "lucide-react";

// ─── Nav link definitions per role ────────────────────────────────
const adminLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pending-claims", label: "Claims", icon: ClipboardList },
  { to: "/customer-search", label: "Customers", icon: Search },
  { to: "/manage-data", label: "Manage", icon: Settings },
];

const customerLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/browse-plans", label: "Plans", icon: ShieldCheck },
  { to: "/my-policies", label: "Policies", icon: FileText },
  { to: "/submit-claim", label: "Submit Claim", icon: HeartPulse },
  { to: "/my-claims", label: "My Claims", icon: ClipboardList },
  { to: "/family-members", label: "Family", icon: Users },
];

const hospitalLinks = [
  { to: "/", label: "Claims", icon: Building2 },
];

// ─── Role colors ──────────────────────────────────────────────────
const roleStyle: Record<string, { color: string; bg: string; label: string }> = {
  admin:    { color: "#6366F1", bg: "rgba(99,102,241,0.12)",  label: "Admin" },
  customer: { color: "#34D399", bg: "rgba(16,185,129,0.12)",  label: "Customer" },
  hospital: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  label: "Hospital" },
};

export default function Navbar() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { role } = useSelector((state: RootState) => state.auth);

  const [scrolled, setScrolled] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const links =
    role === "admin"    ? adminLinks    :
    role === "customer" ? customerLinks :
    hospitalLinks;

  const rs = role ? roleStyle[role] : null;

  const connectWallet = async () => {
    try {
      const eth = (window as any).ethereum;
      if (eth) {
        const accounts = await eth.request({ method: "eth_requestAccounts" });
        setWallet(accounts[0]);
      } else {
        alert("No wallet detected. Please install OKX Wallet or MetaMask.");
      }
    } catch { /* user rejected */ }
  };

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <>
      <motion.nav
        initial={{ y: -56, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="sticky top-0 z-50"
        style={{
          background: "rgba(8,8,16,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          transition: "background 0.25s ease",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "#fff" }}
            >
              <Brain size={14} color="#000" />
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ color: "#F8FAFC" }}>
              ClearClaim <span className="gradient-text-indigo">AI</span>
            </span>
          </Link>

          {/* ── Desktop nav links — indigo underline active ── */}
          {role && (
            <nav className="hidden md:flex items-center gap-1">
              {links.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`nav-link-v2 ${isActive(to) ? "active" : ""}`}
                >
                  {label}
                </Link>
              ))}
              <Link to="/docs" className={`nav-link-v2 ${location.pathname === "/docs" ? "active" : ""}`}>
                Docs
              </Link>
            </nav>
          )}

          {/* ── Right side actions ── */}
          <div className="flex items-center gap-2 shrink-0">

            {/* AI status dot — ring pulse animation */}
            {role === "admin" && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#34D399" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-ring-pulse"
                  style={{ background: "#34D399" }}
                />
                AI Online
              </div>
            )}

            {/* Wallet connect — OKX-style */}
            <button
              onClick={connectWallet}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
              style={{
                background: wallet ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)",
                border: wallet ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(255,255,255,0.1)",
                color: wallet ? "#34D399" : "#94A3B8",
              }}
            >
              {wallet ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34D399" }} />
                  {`${wallet.slice(0, 6)}…${wallet.slice(-4)}`}
                </>
              ) : (
                <>
                  <Wallet size={12} />
                  Connect
                </>
              )}
            </button>

            {/* Role badge */}
            {rs && (
              <span
                className="hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                style={{ background: rs.bg, color: rs.color, border: `1px solid ${rs.color}30` }}
              >
                {rs.label}
              </span>
            )}

            {/* Logout */}
            {role && (
              <button
                onClick={() => dispatch(logout())}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                title="Sign out"
              >
                <LogOut size={15} style={{ color: "#64748B" }} />
              </button>
            )}

            {/* Mobile hamburger */}
            {role && (
              <button
                onClick={() => setMobileOpen((o) => !o)}
                className="md:hidden p-1.5 rounded-lg hover:bg-white/5"
              >
                {mobileOpen
                  ? <X size={18} style={{ color: "#94A3B8" }} />
                  : <Menu size={18} style={{ color: "#94A3B8" }} />
                }
              </button>
            )}

          </div>
        </div>

        {/* Thin gradient bottom line */}
        <div
          className="h-px"
          style={{ background: "linear-gradient(90deg, transparent, #6366F1, transparent)" }}
        />
      </motion.nav>

      {/* ── Mobile nav drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden sticky top-14 z-40 overflow-hidden"
            style={{
              background: "rgba(8,8,16,0.98)",
              backdropFilter: "blur(20px)",
              borderBottom: "1px solid #1a1a1a",
            }}
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(to)
                      ? "text-white bg-white/8"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
              <Link
                to="/docs"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <FileText size={15} />
                Docs
              </Link>
              {/* Wallet on mobile */}
              <button
                onClick={connectWallet}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-left"
              >
                <Wallet size={15} />
                {wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Connect Wallet"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

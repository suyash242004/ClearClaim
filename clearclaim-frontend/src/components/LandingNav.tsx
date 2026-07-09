// LandingNav.tsx — Ghast-style minimal landing page navbar
// Only used on Landing page (not inside app). Black bg, white text.
// On scroll: adds border-bottom: 1px solid #1a1a1a

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Brain } from "lucide-react";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navItems = ["Insurance", "Agents", "Blockchain", "Docs"];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(8,8,16,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid #1a1a1a" : "1px solid transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/landing" className="flex items-center gap-2.5 group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#fff" }}
          >
            <Brain size={14} color="#000" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            ClearClaim <span className="gradient-text-indigo">AI</span>
          </span>
        </Link>

        {/* Center nav — small caps, spaced */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item}
              href={item === "Docs" ? "/docs" : `#${item.toLowerCase()}`}
              className="text-xs font-medium tracking-[0.15em] uppercase transition-colors"
              style={{ color: "#888899" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#888899")}
            >
              {item}
            </a>
          ))}
        </div>

        {/* Right CTA */}
        <Link
          to="/login"
          className="btn-ghast text-xs px-5 py-2"
        >
          Launch App →
        </Link>
      </div>
    </nav>
  );
}
